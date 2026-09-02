"""
Data validation layer. Runs BEFORE the health model.

Detects structural and per-cell data problems and classifies each sensor
reading with a quality state (VALID / MISSING / SUSPECT / INVALID) without
assuming any sensor problem implies engine failure.
"""
from __future__ import annotations
from typing import List, Dict, Tuple
import pandas as pd
import numpy as np

from config import REQUIRED_COLUMNS, MODEL_CONFIG

SENSOR_COLUMNS = ["rpm", "temperature", "oil_pressure", "vibration", "fuel_rate"]


class ValidationError(Exception):
    """Raised for structural problems that prevent any processing at all."""


class ValidationResult:
    def __init__(self):
        self.notes: List[str] = []
        self.missing_count = 0
        self.duplicate_count = 0
        self.invalid_count = 0
        self.suspicious_count = 0
        self.total_cells = 0
        self.total_rows = 0
        self.insufficient_data = False


def validate_columns(df: pd.DataFrame) -> None:
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValidationError(
            f"CSV is missing required column(s): {', '.join(missing)}. "
            f"Required columns are: {', '.join(REQUIRED_COLUMNS)}."
        )
    if len(df) == 0:
        raise ValidationError("CSV contains no data rows.")


def _parse_timestamps(df: pd.DataFrame, result: ValidationResult) -> pd.Series:
    parsed = pd.to_datetime(df["timestamp"], errors="coerce")
    bad = parsed.isna().sum()
    if bad > 0:
        result.notes.append(f"{bad} row(s) had malformed/unparseable timestamps.")
    return parsed


def _flag_duplicates(parsed_ts: pd.Series, result: ValidationResult) -> pd.Series:
    dup_mask = parsed_ts.duplicated(keep="first") & parsed_ts.notna()
    result.duplicate_count = int(dup_mask.sum())
    if result.duplicate_count > 0:
        result.notes.append(f"{result.duplicate_count} duplicate timestamp(s) detected.")
    return dup_mask


def classify_cell(col: str, value, prev_value=None) -> str:
    """Classify a single sensor cell as VALID / MISSING / SUSPECT / INVALID."""
    bounds = MODEL_CONFIG["physical_bounds"].get(col)

    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "MISSING"

    try:
        v = float(value)
    except (TypeError, ValueError):
        return "INVALID"

    if bounds is not None:
        lo, hi = bounds
        if v < lo or v > hi:
            return "INVALID"

    if prev_value is not None and not (isinstance(prev_value, float) and np.isnan(prev_value)):
        try:
            pv = float(prev_value)
            # Flag extreme single-step jumps as SUSPECT (not automatically engine failure).
            span = (bounds[1] - bounds[0]) if bounds else max(abs(pv), 1.0) * 4
            if span > 0 and abs(v - pv) > 0.6 * span:
                return "SUSPECT"
        except (TypeError, ValueError):
            pass

    return "VALID"


def build_quality_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """Returns a DataFrame of the same shape (index x SENSOR_COLUMNS) with
    quality classifications for every sensor cell."""
    quality = pd.DataFrame(index=df.index, columns=SENSOR_COLUMNS, dtype=object)
    for col in SENSOR_COLUMNS:
        prev = None
        for i in df.index:
            val = df.at[i, col] if col in df.columns else None
            quality.at[i, col] = classify_cell(col, val, prev)
            if quality.at[i, col] in ("VALID", "SUSPECT"):
                prev = val
    return quality


def run_validation(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, ValidationResult]:
    """
    Returns (df, parsed_timestamps, quality_matrix, result)
    """
    validate_columns(df)
    result = ValidationResult()
    result.total_rows = len(df)

    parsed_ts = _parse_timestamps(df, result)
    dup_mask = _flag_duplicates(parsed_ts, result)

    quality = build_quality_matrix(df)

    result.total_cells = len(df) * len(SENSOR_COLUMNS)
    result.missing_count = int((quality == "MISSING").sum().sum())
    result.invalid_count = int((quality == "INVALID").sum().sum())
    result.suspicious_count = int((quality == "SUSPECT").sum().sum())

    if result.missing_count:
        result.notes.append(f"{result.missing_count} missing sensor value(s) detected across the file.")
    if result.invalid_count:
        result.notes.append(f"{result.invalid_count} physically implausible sensor value(s) detected.")
    if result.suspicious_count:
        result.notes.append(f"{result.suspicious_count} sudden/suspect sensor jump(s) detected.")

    for i in df.index:
        if dup_mask.loc[i]:
            for col in SENSOR_COLUMNS:
                if quality.at[i, col] == "VALID":
                    quality.at[i, col] = "SUSPECT"

    if result.total_rows < MODEL_CONFIG["data_quality"]["insufficient_rows"]:
        result.insufficient_data = True
        result.notes.append(
            f"Only {result.total_rows} row(s) supplied; too few for a reliable trend/state model."
        )

    return df, parsed_ts, quality, result
