import json
import tempfile
import uuid
from pathlib import Path

_BASE = Path(tempfile.gettempdir()) / "index"


def _session_dir(session_id: str) -> Path:
    return _BASE / session_id


def create_session() -> str:
    session_id = str(uuid.uuid4())
    d = _session_dir(session_id)
    d.mkdir(parents=True, exist_ok=True)
    _write_meta(session_id, {"session_id": session_id, "context": "", "sources": {}})
    return session_id


def get_session(session_id: str) -> dict | None:
    meta = _session_dir(session_id) / "meta.json"
    if not meta.exists():
        return None
    return json.loads(meta.read_text(encoding="utf-8"))


def update_session(session_id: str, updates: dict) -> None:
    meta = get_session(session_id)
    if meta is None:
        raise ValueError(f"Session {session_id} introuvable")
    meta.update(updates)
    _write_meta(session_id, meta)


def session_dir(session_id: str) -> Path:
    return _session_dir(session_id)


def _write_meta(session_id: str, data: dict) -> None:
    path = _session_dir(session_id) / "meta.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
