import json
import pandas as pd
from pathlib import Path

from storage.session_store import get_session, session_dir
from services.ingestion.csv_reader import read_csv
from services.ingestion.excel_reader import read_excel


def _load_dataframe(session_id: str, slot: str, source_meta: dict) -> pd.DataFrame:
    src_type = source_meta.get("type")
    d = session_dir(session_id) / f"source_{slot}"

    if src_type == "api":
        data_file = d / "data.json"
        rows = json.loads(data_file.read_text(encoding="utf-8"))
        return pd.DataFrame(rows)

    # csv or excel — find the stored file
    files = [f for f in d.iterdir() if f.is_file() and f.suffix.lower() in (".csv", ".xlsx", ".xls")]
    if not files:
        raise FileNotFoundError(f"Fichier source {slot} introuvable dans la session.")
    f = files[0]

    if f.suffix.lower() == ".csv":
        for encoding in ("utf-8", "latin-1", "cp1252"):
            for sep in (",", ";", "\t"):
                try:
                    df = pd.read_csv(f, encoding=encoding, sep=sep)
                    if df.shape[1] > 1 or sep == ",":
                        df.columns = [str(c).strip() for c in df.columns]
                        return df
                except Exception:
                    continue
        raise ValueError("Impossible de relire le fichier CSV.")
    else:
        sheets = source_meta.get("sheets") or None
        df = pd.read_excel(f, sheet_name=sheets[0] if sheets and len(sheets) == 1 else (sheets or 0))
        if isinstance(df, dict):
            df = pd.concat(df.values(), ignore_index=True)
        df.columns = [str(c).strip() for c in df.columns]
        return df


def merge(session_id: str) -> pd.DataFrame:
    session = get_session(session_id)
    sources = session.get("sources", {})
    mapping = session.get("mapping", {})

    df_a = _load_dataframe(session_id, "A", sources["A"])
    df_b = _load_dataframe(session_id, "B", sources["B"])

    confirmed = [p for p in mapping.get("proposals", []) if p["status"] == "confirmed"]
    decisions = mapping.get("unmatched_decisions", {})

    if not confirmed:
        # No join key — just concat columns side by side (truncate to min length)
        n = min(len(df_a), len(df_b))
        return pd.concat([df_a.head(n).reset_index(drop=True), df_b.head(n).reset_index(drop=True)], axis=1)

    # Use first confirmed pair as join key
    key = confirmed[0]
    col_a_key = key["col_a"]
    col_b_key = key["col_b"]

    df_b_renamed = df_b.rename(columns={col_b_key: col_a_key})
    merged = pd.merge(df_a, df_b_renamed, on=col_a_key, how="outer", suffixes=("_A", "_B"))

    # Rename remaining confirmed pairs: keep col_a name, rename col_b column
    for p in confirmed[1:]:
        col_b_orig = p["col_b"]
        col_b_after_rename = col_b_orig  # may have _B suffix after merge
        col_a_target = p["col_a"]
        for candidate in (col_b_orig, col_b_orig + "_B", col_b_orig + "_A"):
            if candidate in merged.columns:
                merged = merged.rename(columns={candidate: col_a_target + "_B"})
                break

    # Apply unmatched decisions — exclude columns marked "exclude"
    excluded = {col for col, decision in decisions.items() if decision == "exclude"}
    cols_to_keep = [c for c in merged.columns if c not in excluded]
    return merged[cols_to_keep]
