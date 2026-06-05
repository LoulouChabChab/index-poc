import pandas as pd
from pathlib import Path

SAMPLE_SIZE = 10


def list_sheets(path: Path) -> list[str]:
    xl = pd.ExcelFile(path)
    return xl.sheet_names


def read_excel(path: Path, sheets: list[str] | None = None) -> dict:
    xl = pd.ExcelFile(path)
    available = xl.sheet_names

    if sheets is None:
        sheets = available

    invalid = [s for s in sheets if s not in available]
    if invalid:
        raise ValueError(f"Feuilles introuvables : {', '.join(invalid)}")

    if len(sheets) == 1:
        df = pd.read_excel(path, sheet_name=sheets[0], nrows=500)
    else:
        frames = [pd.read_excel(path, sheet_name=s, nrows=500) for s in sheets]
        df = pd.concat(frames, ignore_index=True)

    df.columns = [str(c).strip() for c in df.columns]
    columns = []
    for col in df.columns:
        samples = df[col].dropna().astype(str).head(SAMPLE_SIZE).tolist()
        columns.append({"name": col, "samples": samples})

    return {"columns": columns, "row_count": len(df), "sheets": sheets}
