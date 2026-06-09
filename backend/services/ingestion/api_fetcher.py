import httpx
from pathlib import Path

SAMPLE_SIZE = 10
MAX_ROWS = 500
MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024  # 50 Mo

_FILE_CONTENT_TYPES = (
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
)


def is_file_url(url: str, content_type: str) -> tuple[bool, str]:
    """Return (is_file, extension). Checks URL path then Content-Type."""
    lower = url.lower().split("?")[0]
    for ext in (".csv", ".xlsx", ".xls"):
        if lower.endswith(ext):
            return True, ext
    ct = (content_type or "").lower()
    if "csv" in ct:
        return True, ".csv"
    if "spreadsheet" in ct or "excel" in ct or "ms-excel" in ct:
        return True, ".xlsx"
    return False, ""


def fetch_file_url(url: str, dest_path: Path, headers: dict | None = None) -> None:
    """Stream-download a file URL to dest_path. Raises ValueError on error."""
    try:
        with httpx.stream("GET", url, headers=headers or {}, timeout=60,
                          follow_redirects=True) as r:
            r.raise_for_status()
            downloaded = 0
            with open(dest_path, "wb") as f:
                for chunk in r.iter_bytes(chunk_size=65536):
                    downloaded += len(chunk)
                    if downloaded > MAX_DOWNLOAD_BYTES:
                        raise ValueError(
                            f"Le fichier dépasse la limite de {MAX_DOWNLOAD_BYTES // 1024 // 1024} Mo."
                        )
                    f.write(chunk)
    except ValueError:
        raise
    except httpx.TimeoutException:
        raise ValueError("Le serveur ne répond pas dans les délais impartis.")
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Le serveur a retourné une erreur : {e.response.status_code}")
    except Exception:
        raise ValueError("Impossible de télécharger le fichier depuis cette URL.")


def fetch_api(url: str, headers: dict | None = None, params: dict | None = None) -> dict:
    """Fetch a JSON API URL. Returns schema dict with _rows key."""
    try:
        r = httpx.get(url, headers=headers or {}, params=params or {},
                      timeout=30, follow_redirects=True)
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
    return {"columns": columns, "row_count": len(rows), "_rows": rows}


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
