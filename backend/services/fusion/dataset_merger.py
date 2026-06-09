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
        stored_enc = source_meta.get("encoding")
        stored_sep = source_meta.get("sep")
        # Try stored encoding/sep first (from initial upload detection), then fallbacks
        encodings = ([stored_enc] if stored_enc else []) + [e for e in ("utf-8", "latin-1", "cp1252") if e != stored_enc]
        seps = ([stored_sep] if stored_sep else []) + [s for s in (",", ";", "\t") if s != stored_sep]
        for encoding in encodings:
            for sep in seps:
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


def _best_join_key(confirmed: list, df_a: pd.DataFrame, df_b: pd.DataFrame) -> dict:
    """Pick the confirmed pair that minimises post-merge row duplication.

    For each candidate key, a perfect join (1-to-1) produces exactly
    max(len(df_a), len(df_b)) rows. We score each pair by the ratio of
    unique values in both frames and pick the one closest to 1.0.
    Falls back to the first confirmed pair if scoring is inconclusive.
    """
    best = confirmed[0]
    best_score = -1.0
    for p in confirmed:
        col_a, col_b = p["col_a"], p["col_b"]
        if col_a not in df_a.columns or col_b not in df_b.columns:
            continue
        nuniq_a = df_a[col_a].nunique()
        nuniq_b = df_b[col_b].nunique()
        # Score = harmonic mean of (unique / total) for both sides
        ratio_a = nuniq_a / max(len(df_a), 1)
        ratio_b = nuniq_b / max(len(df_b), 1)
        score = 2 * ratio_a * ratio_b / (ratio_a + ratio_b) if (ratio_a + ratio_b) > 0 else 0
        if score > best_score:
            best_score = score
            best = p
    return best


def merge(session_id: str) -> tuple[pd.DataFrame, dict]:
    """Return (merged_dataframe, merge_info) where merge_info carries quality signals."""
    session = get_session(session_id)
    sources = session.get("sources", {})
    mapping = session.get("mapping", {})

    df_a = _load_dataframe(session_id, "A", sources["A"])
    df_b = _load_dataframe(session_id, "B", sources["B"])

    confirmed = [p for p in mapping.get("proposals", []) if p["status"] == "confirmed"]
    decisions = mapping.get("unmatched_decisions", {})

    if not confirmed:
        n = min(len(df_a), len(df_b))
        merged = pd.concat([df_a.head(n).reset_index(drop=True), df_b.head(n).reset_index(drop=True)], axis=1)
        return merged, {"join_key": None, "has_duplicates": False, "duplicate_count": 0}

    # Pick the best join key (highest uniqueness ratio)
    key = _best_join_key(confirmed, df_a, df_b)
    col_a_key = key["col_a"]
    col_b_key = key["col_b"]

    df_b_renamed = df_b.rename(columns={col_b_key: col_a_key})
    merged = pd.merge(df_a, df_b_renamed, on=col_a_key, how="outer", suffixes=("_A", "_B"))

    # For remaining confirmed pairs, apply keep preference (a / b / both)
    other_confirmed = [p for p in confirmed if p is not key]
    for p in other_confirmed:
        col_a_name = p["col_a"]
        col_b_name = p["col_b"]
        keep = p.get("keep", "a")
        col_a_in_merged = col_a_name + "_A" if col_a_name + "_A" in merged.columns else col_a_name
        col_b_in_merged = col_b_name + "_B" if col_b_name + "_B" in merged.columns else col_b_name

        if keep == "a":
            if col_a_in_merged in merged.columns and col_a_in_merged != col_a_name:
                merged = merged.rename(columns={col_a_in_merged: col_a_name})
            merged = merged.drop(columns=[col_b_in_merged], errors="ignore")
        elif keep == "b":
            if col_b_in_merged in merged.columns and col_b_in_merged != col_b_name:
                merged = merged.rename(columns={col_b_in_merged: col_b_name})
            merged = merged.drop(columns=[col_a_in_merged], errors="ignore")
        else:  # both
            if col_a_in_merged in merged.columns and col_a_in_merged != col_a_name:
                merged = merged.rename(columns={col_a_in_merged: col_a_name})
            if col_b_in_merged in merged.columns and col_b_in_merged != col_b_name:
                merged = merged.rename(columns={col_b_in_merged: col_b_name})

    # Apply unmatched decisions
    excluded = {col for col, decision in decisions.items() if decision == "exclude"}
    cols_to_keep = [c for c in merged.columns if c not in excluded]
    merged = merged[cols_to_keep]

    # Detect duplicate rows produced by the join (non-unique key)
    expected_rows = max(len(df_a), len(df_b))
    duplicate_count = max(0, len(merged) - expected_rows)
    has_duplicates = duplicate_count > 0

    info = {
        "join_key": col_a_key,
        "has_duplicates": has_duplicates,
        "duplicate_count": duplicate_count,
    }
    return merged, info
