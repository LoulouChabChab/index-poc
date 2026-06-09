import json
import shutil
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from services.ingestion.csv_reader import read_csv
from services.ingestion.excel_reader import list_sheets, read_excel
from services.ingestion.api_fetcher import fetch_api, fetch_file_url, is_file_url
from storage.session_store import get_session, update_session, session_dir

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 Mo


@router.post("/sessions/{session_id}/sources/upload")
async def upload_file(
    session_id: str,
    slot: str = Form(...),
    file: UploadFile = File(...),
    sheets: str = Form(default=""),
):
    _check_session(session_id)
    _check_slot(slot)

    dest_dir = session_dir(session_id) / f"source_{slot}"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / file.filename

    written = 0
    with open(dest, "wb") as out:
        while chunk := await file.read(65536):
            written += len(chunk)
            if written > MAX_FILE_SIZE:
                dest.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Le fichier dépasse la limite de 50 Mo.")
            out.write(chunk)

    try:
        ext = Path(file.filename).suffix.lower()
        if ext in (".xlsx", ".xls"):
            available_sheets = list_sheets(dest)
            selected = [s.strip() for s in sheets.split(",")] if sheets.strip() else None
            schema = read_excel(dest, selected)
            schema["file_name"] = file.filename
            schema["available_sheets"] = available_sheets
            schema["type"] = "excel"
        elif ext == ".csv":
            schema = read_csv(dest)
            schema["file_name"] = file.filename
            schema["type"] = "csv"
        else:
            raise HTTPException(status_code=422, detail="Format non supporté. Utilisez CSV ou Excel (.xlsx/.xls).")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    _save_source(session_id, slot, schema)
    return {"data": schema, "error": None}


class UrlPayload(BaseModel):
    url: str
    slot: str
    headers: dict = {}
    params: dict = {}


@router.post("/sessions/{session_id}/sources/fetch-url")
async def fetch_url(session_id: str, body: UrlPayload):
    _check_session(session_id)
    _check_slot(body.slot)

    dest_dir = session_dir(session_id) / f"source_{body.slot}"
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Probe the URL to determine type (HEAD request, fallback to GET)
    try:
        import httpx
        probe = httpx.head(body.url, headers=body.headers or {}, timeout=10,
                           follow_redirects=True)
        content_type = probe.headers.get("content-type", "")
    except Exception:
        content_type = ""

    file_detected, ext = is_file_url(body.url, content_type)

    if file_detected:
        # Determine filename from URL or fallback
        url_path = body.url.split("?")[0].rstrip("/")
        filename = url_path.split("/")[-1] or f"source{ext}"
        if not filename.lower().endswith((".csv", ".xlsx", ".xls")):
            filename += ext or ".csv"

        dest = dest_dir / filename
        try:
            fetch_file_url(body.url, dest, headers=body.headers)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        try:
            actual_ext = Path(filename).suffix.lower()
            if actual_ext in (".xlsx", ".xls"):
                available_sheets = list_sheets(dest)
                schema = read_excel(dest, None)
                schema["file_name"] = filename
                schema["available_sheets"] = available_sheets
                schema["type"] = "excel"
            else:
                schema = read_csv(dest)
                schema["file_name"] = filename
                schema["type"] = "csv"
            schema["url"] = body.url
        except Exception as e:
            raise HTTPException(status_code=422, detail=str(e))

        _save_source(session_id, body.slot, schema)
        return {"data": schema, "error": None}

    # JSON API
    try:
        result = fetch_api(body.url, headers=body.headers, params=body.params)
        rows = result.pop("_rows", [])
        result["url"] = body.url
        result["type"] = "api"
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    (dest_dir / "data.json").write_text(
        json.dumps(rows, ensure_ascii=False), encoding="utf-8"
    )

    _save_source(session_id, body.slot, result)
    return {"data": result, "error": None}


@router.get("/sessions/{session_id}/sources/{slot}/sheets")
async def get_sheets(session_id: str, slot: str):
    _check_session(session_id)
    _check_slot(slot)
    dest_dir = session_dir(session_id) / f"source_{slot}"
    files = list(dest_dir.glob("*.xls*")) if dest_dir.exists() else []
    if not files:
        raise HTTPException(status_code=404, detail="Aucun fichier Excel trouvé pour ce slot.")
    return {"data": {"sheets": list_sheets(files[0])}, "error": None}


def _check_session(session_id: str):
    if get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Session introuvable")


def _check_slot(slot: str):
    if slot not in ("A", "B"):
        raise HTTPException(status_code=422, detail="Le slot doit être A ou B.")


def _save_source(session_id: str, slot: str, schema: dict):
    session = get_session(session_id)
    sources = session.get("sources", {})
    sources[slot] = schema
    update_session(session_id, {"sources": sources})
