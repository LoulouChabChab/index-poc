import chardet
import pandas as pd
from pathlib import Path

SAMPLE_SIZE = 10
_ENCODINGS_FALLBACK = ("utf-8", "latin-1", "cp1252")
_SEPARATORS = (",", ";", "\t")


def read_csv(path: Path) -> dict:
    raw = path.read_bytes()
    detected = chardet.detect(raw[:50_000])
    detected_enc = (detected.get("encoding") or "utf-8").lower()

    # Build ordered list: detected encoding first, then fallbacks (no duplicates)
    encodings = [detected_enc] + [e for e in _ENCODINGS_FALLBACK if e != detected_enc]

    for encoding in encodings:
        for sep in _SEPARATORS:
            try:
                df = pd.read_csv(path, encoding=encoding, sep=sep, nrows=500)
                if df.shape[1] > 1 or sep == ",":
                    # Lire le fichier complet uniquement pour les colonnes sparse
                    sparse_cols = [c for c in df.columns if df[c].dropna().empty]
                    df_full = None
                    if sparse_cols:
                        try:
                            df_full = pd.read_csv(path, encoding=encoding, sep=sep)
                        except Exception:
                            pass
                    schema = _extract_schema(df, df_full)
                    schema["encoding"] = encoding
                    schema["sep"] = sep
                    return schema
            except Exception:
                continue
    raise ValueError("Impossible de lire le fichier CSV. Vérifiez qu'il n'est pas corrompu.")


def _extract_schema(df: pd.DataFrame, df_full: pd.DataFrame | None = None) -> dict:
    df.columns = [str(c).strip() for c in df.columns]
    if df_full is not None:
        df_full.columns = [str(c).strip() for c in df_full.columns]
    columns = []
    for col in df.columns:
        samples = df[col].dropna().astype(str).str.strip().replace('', pd.NA).dropna().head(SAMPLE_SIZE).tolist()
        # Si pas assez d'exemples, chercher dans le reste du fichier
        if len(samples) < 3 and df_full is not None and col in df_full.columns:
            samples = df_full[col].dropna().astype(str).str.strip().replace('', pd.NA).dropna().head(SAMPLE_SIZE).tolist()
        columns.append({"name": col, "samples": samples})
    return {"columns": columns, "row_count": len(df_full) if df_full is not None else len(df)}
