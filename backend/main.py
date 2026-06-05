from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

from api.routes import sessions, sources, mappings, exports

app = FastAPI(title="Index API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(mappings.router, prefix="/api")
app.include_router(exports.router, prefix="/api")


@app.get("/api/health")
async def health():
    ollama_status = "ko"
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get("http://localhost:11434/api/tags", timeout=2)
            if r.status_code == 200:
                ollama_status = "ok"
    except Exception:
        pass
    return {"data": {"status": "ok", "ollama": ollama_status}, "error": None}
