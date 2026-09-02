import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from simulation import run_simulation, apply_what_if


def test_changing_vibration_modifies_output():
    df = pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01", periods=15, freq="30s").astype(str),
        "rpm": [2400.0] * 15,
        "temperature": [92.0] * 15,
        "oil_pressure": [42.0] * 15,
        "vibration": [1.0] * 15,
        "fuel_rate": [5.5] * 15,
    })
    sim = run_simulation(df)
    result = apply_what_if(sim, row_index=None, deltas={
        "rpm_delta": 0, "temperature_delta": 0, "oil_pressure_delta": 0,
        "vibration_delta": 3.0, "fuel_rate_delta": 0,
    })
    assert result["scenario_health"] < result["baseline_health"]
    assert result["delta"] < 0
    assert result["primary_affected_subsystem"] == "mechanical"
