import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from simulation import run_simulation


def _base_df(n=20):
    return pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01", periods=n, freq="30s").astype(str),
        "rpm": [2400.0] * n,
        "temperature": [92.0] * n,
        "oil_pressure": [42.0] * n,
        "vibration": [1.0] * n,
        "fuel_rate": [5.5] * n,
    })


def test_missing_sensors_reduce_quality_score():
    clean = _base_df()
    clean_result = run_simulation(clean.copy())

    dirty = _base_df()
    dirty.loc[2:6, "oil_pressure"] = None
    dirty_result = run_simulation(dirty)

    assert dirty_result["data_quality"]["telemetry_quality_score"] < clean_result["data_quality"]["telemetry_quality_score"]
