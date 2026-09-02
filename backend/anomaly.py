"""
Lightweight, explainable anomaly detection.

Techniques used (deliberately simple, no ML):
  1. operating-range check   (value outside expected regime envelope)
  2. rolling deviation       (z-score vs. trailing rolling window)
  3. rate-of-change          (sudden jump vs. trailing rolling std of deltas)

Every anomaly is tagged SENSOR_DATA_QUALITY or ENGINE_CONDITION - never both,
and a bad/missing sensor reading is never auto-labeled an engine failure.
"""
from __future__ import annotations
from typing import List, Dict, Optional
import numpy as np

from config import MODEL_CONFIG
from preprocessing import context_deviation

CFG = MODEL_CONFIG["anomaly"]
SENSOR_COLUMNS = ["rpm", "temperature", "oil_pressure", "vibration", "fuel_rate"]

# Sensors whose sustained out-of-envelope drift represents a plausible engine
# condition signal (as opposed to a one-off bad reading).
ENGINE_CONDITION_SENSORS = {"vibration", "temperature", "oil_pressure"}


def detect_anomalies(
    rows: List[Dict],
    quality_matrix: List[Dict[str, str]],
    regimes: List[str],
) -> List[dict]:
    """
    rows: list of dicts with sensor values keyed by SENSOR_COLUMNS, one per row
    quality_matrix: list of {sensor: quality} per row (from validation layer)
    regimes: operating regime per row
    """
    anomalies: List[dict] = []
    window = CFG["rolling_window"]

    history: Dict[str, List[float]] = {c: [] for c in SENSOR_COLUMNS}
    z_streak: Dict[str, int] = {c: 0 for c in SENSOR_COLUMNS}

    for i, row in enumerate(rows):
        regime = regimes[i]
        q_row = quality_matrix[i]

        for sensor in SENSOR_COLUMNS:
            q = q_row.get(sensor, "MISSING")
            value = row.get(sensor)

            # --- 1. Data-quality anomalies (never labeled engine condition) ---
            if q == "INVALID":
                anomalies.append(_anom(i, "SENSOR_DATA_QUALITY", sensor, "range_check",
                    f"{sensor} reading is physically implausible and was excluded from scoring."))
                continue
            if q == "SUSPECT":
                anomalies.append(_anom(i, "SENSOR_DATA_QUALITY", sensor, "rate_of_change",
                    f"{sensor} reading is inconsistent with recent observations (possible sensor/data anomaly)."))
                # still consider it for engine-condition checks below using its value
            if q == "MISSING":
                continue

            hist = history[sensor]

            # --- 2. Rolling z-score deviation (requires 2 consecutive flagged
            #     rows so a single noisy sample doesn't read as "persistent") ---
            if len(hist) >= CFG["min_history_for_zscore"]:
                recent = np.array(hist[-window:])
                mu, sigma = recent.mean(), recent.std()
                flagged = False
                if sigma > 1e-6:
                    z = abs((value - mu) / sigma)
                    flagged = z >= CFG["z_score_threshold"]
                if flagged:
                    z_streak[sensor] += 1
                else:
                    z_streak[sensor] = 0
                if z_streak[sensor] >= 2 and sensor in ENGINE_CONDITION_SENSORS:
                    anomalies.append(_anom(i, "ENGINE_CONDITION", sensor, "rolling_z_score",
                        f"Persistent deviation in {sensor} relative to its recent operating baseline "
                        f"(possible mechanical/thermal degradation pattern)."))

            # --- 3. Operating-envelope check (context-adjusted) ---
            dev = context_deviation(regime, sensor, value)
            if dev is not None and dev > 0.5 and sensor in ENGINE_CONDITION_SENSORS:
                anomalies.append(_anom(i, "ENGINE_CONDITION", sensor, "operating_range_check",
                    f"{sensor} sits well outside its expected range for the current ({regime}) operating regime."))

            history[sensor].append(value)

    return anomalies


def _anom(index: int, category: str, sensor: str, method: str, detail: str) -> dict:
    return {"index": index, "category": category, "sensor": sensor, "method": method, "detail": detail}
