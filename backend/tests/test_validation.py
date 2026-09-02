import pandas as pd
import pytest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from validation import run_validation, validate_columns, ValidationError


def _base_df(n=10):
    return pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01", periods=n, freq="s").astype(str),
        "rpm": [2400.0] * n,
        "temperature": [90.0] * n,
        "oil_pressure": [42.0] * n,
        "vibration": [1.0] * n,
        "fuel_rate": [5.5] * n,
    })


def test_missing_column_raises():
    df = _base_df().drop(columns=["vibration"])
    with pytest.raises(ValidationError):
        validate_columns(df)


def test_missing_value_detected():
    df = _base_df()
    df.loc[3, "temperature"] = None
    _, _, quality, result = run_validation(df)
    assert result.missing_count >= 1
    assert quality.at[3, "temperature"] == "MISSING"


def test_invalid_value_detected():
    df = _base_df()
    df.loc[2, "rpm"] = -100  # outside physical bounds
    _, _, quality, result = run_validation(df)
    assert quality.at[2, "rpm"] == "INVALID"
    assert result.invalid_count >= 1


def test_duplicate_timestamp_detected():
    df = _base_df()
    df.loc[5, "timestamp"] = df.loc[4, "timestamp"]
    _, _, _, result = run_validation(df)
    assert result.duplicate_count >= 1
