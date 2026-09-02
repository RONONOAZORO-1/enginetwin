import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trend import summarize_trend


def test_stable_series_gives_stable_direction():
    values = [90.0, 90.2, 89.9, 90.1, 90.0, 89.8, 90.3, 90.0]
    summary = summarize_trend(values)
    assert summary["direction"] == "STABLE"


def test_persistent_decline_gives_deteriorating():
    values = [90, 85, 80, 75, 70, 65, 60, 55, 50]
    summary = summarize_trend(values)
    assert summary["direction"] in ("DETERIORATING", "RAPID_DETERIORATION")
