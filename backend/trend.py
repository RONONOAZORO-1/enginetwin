"""
Trend engine: rolling mean/slope over the health-index series, classified
into STABLE / IMPROVING / DETERIORATING / RAPID_DETERIORATION.
"""
from __future__ import annotations
from typing import List, Optional
import numpy as np

from config import MODEL_CONFIG

CFG = MODEL_CONFIG["trend"]


def _slope(values: List[float]) -> float:
    """Least-squares slope of health index vs. row index over the window."""
    n = len(values)
    if n < 2:
        return 0.0
    xs = np.arange(n, dtype=float)
    ys = np.array(values, dtype=float)
    x_mean, y_mean = xs.mean(), ys.mean()
    denom = ((xs - x_mean) ** 2).sum()
    if denom == 0:
        return 0.0
    return float(((xs - x_mean) * (ys - y_mean)).sum() / denom)


def compute_trend_series(health_values: List[Optional[float]]) -> List[dict]:
    """For each index, compute rolling mean/slope/direction using the
    trailing window of available (non-null) health scores."""
    window = CFG["rolling_window"]
    out = []
    clean_history: List[float] = []

    for i, v in enumerate(health_values):
        if v is not None:
            clean_history.append(v)
        recent = clean_history[-window:]
        rolling_mean = float(np.mean(recent)) if recent else float("nan")
        slope = _slope(recent) if len(recent) >= 2 else 0.0

        if len(recent) < 2:
            direction = "STABLE"
        elif abs(slope) < CFG["stable_slope_threshold"]:
            direction = "STABLE"
        elif slope <= -CFG["rapid_slope_threshold"]:
            direction = "RAPID_DETERIORATION"
        elif slope < 0:
            direction = "DETERIORATING"
        else:
            direction = "IMPROVING"

        out.append({
            "index": i,
            "rolling_mean": None if np.isnan(rolling_mean) else round(rolling_mean, 2),
            "rolling_slope": round(slope, 4),
            "direction": direction,
        })
    return out


def summarize_trend(health_values: List[Optional[float]]) -> dict:
    series = compute_trend_series(health_values)
    clean = [v for v in health_values if v is not None]
    current = clean[-1] if clean else float("nan")
    previous = clean[-2] if len(clean) >= 2 else current
    last = series[-1] if series else {"rolling_mean": float("nan"), "rolling_slope": 0.0, "direction": "STABLE"}
    degradation_rate = -last["rolling_slope"] if last["rolling_slope"] else 0.0
    return {
        "current_health": None if not clean else round(current, 2),
        "previous_health": None if not clean else round(previous, 2),
        "rolling_mean": last["rolling_mean"],
        "rolling_slope": last["rolling_slope"],
        "direction": last["direction"],
        "degradation_rate": round(degradation_rate, 4),
    }
