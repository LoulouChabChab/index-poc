from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from services.fusion.dataset_merger import merge
from services.export.exporter import to_csv, to_excel, to_json
from storage.session_store import get_session

router = APIRouter()

PREVIEW_ROWS = 25


@router.get("/sessions/{session_id}/preview")
async def preview(session_id: str):
    _check_session(session_id)
    try:
        df = merge(session_id)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    rows = df.head(PREVIEW_ROWS).fillna("").to_dict(orient="records")
    return {
        "data": {
            "columns": list(df.columns),
            "rows": rows,
            "total_rows": len(df),
            "total_cols": len(df.columns),
        },
        "error": None,
    }


@router.post("/sessions/{session_id}/export")
async def export_dataset(session_id: str, fmt: str = "csv"):
    _check_session(session_id)
    if fmt not in ("csv", "xlsx", "json"):
        raise HTTPException(status_code=422, detail="Format non supporté. Utilisez csv, xlsx ou json.")

    try:
        df = merge(session_id)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    timestamp = datetime.now().strftime("%Y-%m-%d_%Hh%M")
    filename = f"index_export_{timestamp}.{fmt}"

    if fmt == "csv":
        content = to_csv(df)
        media_type = "text/csv"
    elif fmt == "xlsx":
        content = to_excel(df)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        content = to_json(df)
        media_type = "application/json"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _check_session(session_id: str):
    if get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Session introuvable")
