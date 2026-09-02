"""
Simulated Engine Health Index model.

Transparent, deterministic, explainable. No ML, no black box. Every
subsystem score exposes score/status/deviation/weight/contribution/quality
so the frontend can render a full explanation.
"""
from __future__ import annotations
from typing import Dict, Optional, List
import math

from config import MODEL_CONFIG
from preprocessing import classify_regime, context_deviation

WEIGHTS = MODEL_CONFIG["weights"]

# Which raw sensors feed which subsystem. "operating" and "efficiency" are
# derived composite subsystems rather than a single 1:1 sensor mapping.
SUBSYSTEM_SENSORS = {
    "thermal": ["temperature"],
    "lubrication": ["oil_pressure"],
    "mechanical": ["vibration"],
    "operating": ["rpm"],
    "efficiency": ["fuel_rate"],
}


def _score_from_deviation(deviation: Optional[float]) -> float:
    """Maps a normalized deviation (0 = perfect, higher = worse) to a 0-100
    score using a smooth decay so small deviations barely matter and large
    ones drive the score down quickly."""
    if deviation is None:
        return float("nan")
    deviation = max(deviation, 0.0)
    score = 100.0 * math.exp(-1.8 * deviation)
    return max(0.0, min(100.0, score))


def _status_for_score(score: float) -> str:
    if math.isnan(score):
        return "UNKNOWN"
    if score >= 90:
        return "NOMINAL"
    if score >= 75:
        return "GOOD"
    if score >= 55:
        return "REDUCED"
    if score >= 35:
        return "POOR"
    return "SEVERE"


def score_subsystem(
    subsystem: str,
    sensor_values: Dict[str, Optional[float]],
    sensor_quality: Dict[str, str],
    regime: str,
) -> dict:
    """Score a single subsystem for one telemetry row.

    Returns a dict matching the SubsystemScore schema (weight/contribution
    filled in later once we know which subsystems are usable this row).
    """
    sensors = SUBSYSTEM_SENSORS[subsystem]
    deviations: List[float] = []
    qualities = [sensor_quality.get(s, "MISSING") for s in sensors]

    usable = all(q in ("VALID", "SUSPECT") for q in qualities)

    if subsystem == "operating":
        # Operating subsystem reflects how far RPM sits from the center of
        # its own regime band - a mild, informational signal, not a penalty
        # driver, since RPM defines the regime rather than deviating from it.
        rpm = sensor_values.get("rpm")
        if rpm is None or sensor_quality.get("rpm") == "MISSING":
            return {
                "name": "operating", "score": float("nan"), "status": "UNKNOWN",
                "deviation": float("nan"), "quality": "MISSING",
            }
        lo, hi = MODEL_CONFIG["regime_ranges"][regime]
        mid = (lo + hi) / 2
        width = max(hi - lo, 1.0)
        dev = abs(rpm - mid) / width
        score = _score_from_deviation(dev * 0.6)  # gentle - regime membership itself isn't bad
        return {
            "name": "operating", "score": score, "status": _status_for_score(score),
            "deviation": round(dev, 4), "quality": sensor_quality.get("rpm", "VALID"),
        }

    if not usable:
        q = "MISSING" if "MISSING" in qualities else ("INVALID" if "INVALID" in qualities else "SUSPECT")
        return {
            "name": subsystem, "score": float("nan"), "status": "UNKNOWN",
            "deviation": float("nan"), "quality": q,
        }

    for s in sensors:
        dev = context_deviation(regime, s, sensor_values.get(s))
        if dev is not None:
            deviations.append(dev)

    if not deviations:
        return {
            "name": subsystem, "score": float("nan"), "status": "UNKNOWN",
            "deviation": float("nan"), "quality": "MISSING",
        }

    max_dev = max(deviations)
    score = _score_from_deviation(max_dev)
    quality = "SUSPECT" if "SUSPECT" in qualities else "VALID"
    return {
        "name": subsystem, "score": round(score, 2), "status": _status_for_score(score),
        "deviation": round(max_dev, 4), "quality": quality,
    }


def compute_row_health(
    sensor_values: Dict[str, Optional[float]],
    sensor_quality: Dict[str, str],
) -> dict:
    """Compute all subsystem scores + reweighted overall score for one row.

    Missing/unusable subsystems are EXCLUDED and remaining weights are
    renormalized - never silently treated as a score of zero.
    """
    regime = classify_regime(sensor_values.get("rpm"))
    subsystems = []
    usable_weight_total = 0.0
    weighted_sum = 0.0

    for name in ["thermal", "lubrication", "mechanical", "operating", "efficiency"]:
        result = score_subsystem(name, sensor_values, sensor_quality, regime)
        weight = WEIGHTS[name]
        usable = not math.isnan(result["score"])
        if usable:
            usable_weight_total += weight
        subsystems.append({**result, "weight": weight, "usable": usable})

    if usable_weight_total <= 0:
        overall = float("nan")
    else:
        for s in subsystems:
            if s["usable"]:
                contribution = (s["weight"] / usable_weight_total) * s["score"]
                weighted_sum += contribution
                s["contribution"] = round(contribution, 3)
            else:
                s["contribution"] = 0.0
        overall = max(0.0, min(100.0, weighted_sum))

    for s in subsystems:
        s.pop("usable", None)

    return {
        "regime": regime,
        "overall_score": None if math.isnan(overall) else round(overall, 2),
        "subsystems": subsystems,
        "usable_weight_fraction": round(usable_weight_total, 3),
    }
