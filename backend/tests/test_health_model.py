import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from health_model import compute_row_health


def _stable_values():
    return {"rpm": 2400, "temperature": 92, "oil_pressure": 42, "vibration": 1.0, "fuel_rate": 5.5}


def _valid_quality():
    return {"rpm": "VALID", "temperature": "VALID", "oil_pressure": "VALID", "vibration": "VALID", "fuel_rate": "VALID"}


def test_stable_reading_gives_high_health():
    result = compute_row_health(_stable_values(), _valid_quality())
    assert result["overall_score"] >= 85


def test_increased_vibration_lowers_mechanical_score():
    baseline = compute_row_health(_stable_values(), _valid_quality())
    bad_values = dict(_stable_values(), vibration=4.5)
    degraded = compute_row_health(bad_values, _valid_quality())

    mech_baseline = next(s for s in baseline["subsystems"] if s["name"] == "mechanical")["score"]
    mech_degraded = next(s for s in degraded["subsystems"] if s["name"] == "mechanical")["score"]
    assert mech_degraded < mech_baseline
    assert degraded["overall_score"] < baseline["overall_score"]


def test_declining_oil_pressure_lowers_lubrication_score():
    baseline = compute_row_health(_stable_values(), _valid_quality())
    bad_values = dict(_stable_values(), oil_pressure=15)
    degraded = compute_row_health(bad_values, _valid_quality())

    lube_baseline = next(s for s in baseline["subsystems"] if s["name"] == "lubrication")["score"]
    lube_degraded = next(s for s in degraded["subsystems"] if s["name"] == "lubrication")["score"]
    assert lube_degraded < lube_baseline


def test_missing_sensor_excluded_not_zeroed():
    values = dict(_stable_values())
    quality = dict(_valid_quality(), temperature="MISSING")
    values["temperature"] = None
    result = compute_row_health(values, quality)
    thermal = next(s for s in result["subsystems"] if s["name"] == "thermal")
    assert thermal["quality"] == "MISSING"
    # Overall score should still be computable from remaining subsystems, not crushed to 0.
    assert result["overall_score"] is not None
    assert result["overall_score"] > 50
