import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from state_model import compute_state_series


def test_persistent_degradation_changes_state():
    # health drops and stays low for many rows -> should confirm DEGRADING/WARNING
    values = [95] * 5 + [50] * 10
    flags = [False] * len(values)
    states = compute_state_series(values, flags)
    assert states[-1]["state"] in ("DEGRADING", "WARNING")


def test_isolated_bad_row_does_not_immediately_cause_critical():
    values = [95, 95, 95, 5, 95, 95, 95, 95]  # single noisy CRITICAL-range blip
    flags = [False] * len(values)
    states = compute_state_series(values, flags)
    assert states[3]["raw_state"] == "CRITICAL"
    assert states[3]["state"] != "CRITICAL"  # confirmed state must not flip on one row
