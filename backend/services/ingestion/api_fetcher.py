import httpx

SAMPLE_SIZE = 10
MAX_ROWS = 500


def fetch_api(url: str, headers: dict | None = None, params: dict | None = None) -> dict:
    try:
        r = httpx.get(url, headers=headers or {}, params=params or {}, timeout=15, follow_redirects=True)
        r.raise_for_status()
    except httpx.TimeoutException:
        raise ValueError("L'API ne répond pas dans les délais impartis.")
    except httpx.HTTPStatusError as e:
        raise ValueError(f"L'API a retourné une erreur : {e.response.status_code}")
    except Exception:
        raise ValueError("Impossible de joindre l'URL fournie.")

    try:
        payload = r.json()
    except Exception:
        raise ValueError("La réponse de l'API n'est pas au format JSON.")

    rows = _extract_rows(payload)
    if not rows:
        raise ValueError("Aucune donnée tabulaire trouvée dans la réponse JSON.")

    rows = rows[:MAX_ROWS]
    columns = _extract_columns(rows)
    return {"columns": columns, "row_count": len(rows)}


def _extract_rows(payload) -> list[dict]:
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]
    if isinstance(payload, dict):
        for v in payload.values():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                return v
    return []


def _extract_columns(rows: list[dict]) -> list[dict]:
    keys = list(rows[0].keys()) if rows else []
    columns = []
    for key in keys:
        samples = [str(r[key]) for r in rows[:SAMPLE_SIZE] if key in r and r[key] is not None]
        columns.append({"name": str(key), "samples": samples})
    return columns
