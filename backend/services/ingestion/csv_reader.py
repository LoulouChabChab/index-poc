import pandas as pd
from pathlib import Path

SAMPLE_SIZE = 10


def read_csv(path: Path) -> dict:
    for encoding in ("utf-8", "latin-1", "cp1252"):
        for sep in (",", ";", "\t"):
            try:
                df = pd.read_csv(path, encoding=encoding, sep=sep, nrows=500)
                if df.shape[1] > 1 or sep == ",":
                    return _extract_schema(df)
            except Exception:
                continue
    raise ValueError("Impossible de lire le fichier CSV. Vérifiez qu'il n'est pas corrompu.")


def _extract_schema(df: pd.DataFrame) -> dict:
    df.columns = [str(c).strip() for c in df.columns]
    columns = []
    for col in df.columns:
        samples = df[col].dropna().astype(str).head(SAMPLE_SIZE).tolist()
        columns.append({"name": col, "samples": samples})
    return {"columns": columns, "row_count": len(df)}
