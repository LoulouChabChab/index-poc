import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.ai.mapping_proposer import analyze_schemas, stream_explanation, stream_refinement
from storage.session_store import get_session, update_session

router = APIRouter()


@router.post("/sessions/{session_id}/analyze")
async def analyze(session_id: str):
    session = _get_or_404(session_id)
    sources = session.get("sources", {})
    if "A" not in sources or "B" not in sources:
        raise HTTPException(status_code=422, detail="Les deux sources doivent être chargées avant l'analyse.")

    update_session(session_id, {"analyze_status": "pending", "analyze_error": None})

    async def _run():
        try:
            result = await analyze_schemas(sources["A"], sources["B"], session.get("context", ""))
            update_session(session_id, {"mapping": result, "analyze_status": "done"})
        except Exception as e:
            import traceback
            err = traceback.format_exc()
            print("ANALYZE ERROR:", err)
            update_session(session_id, {"analyze_status": "error", "analyze_error": err})

    asyncio.create_task(_run())
    return {"data": {"status": "pending"}, "error": None}


@router.get("/sessions/{session_id}/analyze/status")
async def analyze_status(session_id: str):
    session = _get_or_404(session_id)
    status = session.get("analyze_status", "idle")
    error = session.get("analyze_error")
    mapping = session.get("mapping")
    return {"data": {"status": status, "mapping": mapping, "error": error}, "error": None}


@router.get("/sessions/{session_id}/mappings")
async def get_mappings(session_id: str):
    session = _get_or_404(session_id)
    mapping = session.get("mapping")
    if not mapping:
        raise HTTPException(status_code=404, detail="Aucune analyse disponible. Lancez d'abord l'analyse.")
    return {"data": mapping, "error": None}


@router.get("/sessions/{session_id}/mappings/{index}/explain")
async def explain(session_id: str, index: int):
    session = _get_or_404(session_id)
    proposal = _get_proposal(session, index)
    sources = session.get("sources", {})

    col_a = proposal["col_a"]
    col_b = proposal["col_b"]
    samples_a = _get_samples(sources.get("A", {}), col_a)
    samples_b = _get_samples(sources.get("B", {}), col_b)

    async def event_stream():
        async for chunk in stream_explanation(col_a, samples_a, col_b, samples_b, proposal["confidence"], session.get("context", "")):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


class ConfirmPayload(BaseModel):
    keep: str = "a"  # "a" | "b" | "both"


@router.post("/sessions/{session_id}/mappings/{index}/confirm")
async def confirm(session_id: str, index: int, body: ConfirmPayload):
    session = _get_or_404(session_id)
    _get_proposal(session, index)
    mapping = session["mapping"]
    mapping["proposals"][index]["status"] = "confirmed"
    mapping["proposals"][index]["keep"] = body.keep
    update_session(session_id, {"mapping": mapping})
    return {"data": {"ok": True}, "error": None}


class RejectPayload(BaseModel):
    manual_col_a: str | None = None
    manual_col_b: str | None = None


@router.post("/sessions/{session_id}/mappings/{index}/reject")
async def reject(session_id: str, index: int, body: RejectPayload):
    session = _get_or_404(session_id)
    _get_proposal(session, index)
    mapping = session["mapping"]

    if body.manual_col_a and body.manual_col_b:
        mapping["proposals"][index].update({
            "col_a": body.manual_col_a,
            "col_b": body.manual_col_b,
            "status": "confirmed",
            "is_computed": False,
        })
    else:
        mapping["proposals"][index]["status"] = "rejected"

    update_session(session_id, {"mapping": mapping})
    return {"data": {"ok": True}, "error": None}


class RefinePayload(BaseModel):
    feedback: str


@router.post("/sessions/{session_id}/mappings/{index}/refine")
async def refine(session_id: str, index: int, body: RefinePayload):
    session = _get_or_404(session_id)
    proposal = _get_proposal(session, index)
    sources = session.get("sources", {})

    async def event_stream():
        chunks = []
        async for chunk in stream_refinement(
            proposal["col_a"], proposal["col_b"], body.feedback,
            sources.get("A", {}), sources.get("B", {}), session.get("context", "")
        ):
            chunks.append(chunk)
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


class UnmatchedPayload(BaseModel):
    decisions: dict  # {"col_name": "include" | "exclude"}


@router.post("/sessions/{session_id}/mappings/unmatched")
async def set_unmatched(session_id: str, body: UnmatchedPayload):
    session = _get_or_404(session_id)
    mapping = session.get("mapping", {})
    mapping["unmatched_decisions"] = body.decisions
    update_session(session_id, {"mapping": mapping})
    return {"data": {"ok": True}, "error": None}


def _get_or_404(session_id: str) -> dict:
    s = get_session(session_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Session introuvable")
    return s


def _get_proposal(session: dict, index: int) -> dict:
    proposals = session.get("mapping", {}).get("proposals", [])
    if index < 0 or index >= len(proposals):
        raise HTTPException(status_code=404, detail="Proposition introuvable")
    return proposals[index]


def _get_samples(schema: dict, col_name: str) -> list:
    for col in schema.get("columns", []):
        if col["name"] == col_name:
            return col["samples"]
    return []
