from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from storage.session_store import create_session, get_session, update_session

router = APIRouter()


@router.post("/sessions")
async def new_session():
    session_id = create_session()
    return {"data": {"session_id": session_id}, "error": None}


@router.get("/sessions/{session_id}")
async def fetch_session(session_id: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session introuvable")
    return {"data": session, "error": None}


class ContextPayload(BaseModel):
    context: str


@router.patch("/sessions/{session_id}/context")
async def set_context(session_id: str, body: ContextPayload):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session introuvable")
    update_session(session_id, {"context": body.context})
    return {"data": {"ok": True}, "error": None}
