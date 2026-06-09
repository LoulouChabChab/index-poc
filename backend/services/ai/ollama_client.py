import json
import httpx

OLLAMA_BASE = "http://localhost:11434"
MODEL = "mistral"


_OPTIONS = {"num_predict": 4096, "num_ctx": 8192, "temperature": 0.2}


async def generate(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=httpx.Timeout(None)) as client:
        r = await client.post(
            f"{OLLAMA_BASE}/api/generate",
            json={"model": MODEL, "prompt": prompt, "stream": False, "options": _OPTIONS},
        )
        r.raise_for_status()
        return r.json()["response"]


async def generate_stream(prompt: str):
    """Yields text chunks as they arrive from Ollama."""
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream(
            "POST",
            f"{OLLAMA_BASE}/api/generate",
            json={"model": MODEL, "prompt": prompt, "stream": True, "options": _OPTIONS},
        ) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    chunk = data.get("response", "")
                    if chunk:
                        yield chunk
                    if data.get("done"):
                        break
                except json.JSONDecodeError:
                    continue
