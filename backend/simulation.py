"""
Core simulation pipeline: CSV -> validation -> preprocessing -> health model
-> trend -> state -> anomalies -> alerts -> contributors -> API payload.

This module contains NO 3D / rendering logic and NO filename-based special
casing. Every dashboard number is derived from the CSV contents.
"""
from __future__ import annotations
from typing import List, Dict, Optional, Tuple
import io
import math
import pandas as pd

from config import MODEL_CONFIG, REQUIRED_COLUMNS
from validation import run_validation, ValidationError, SENSOR_COLUMNS
from preprocessing import classify_regime
from health_model import compute_row_health
from trend import summarize_trend, compute_trend_series
from state_model import compute_state_series
from anomaly import detect_anomalies

DQ_CFG = MODEL_CONFIG["data_quality"]


def load_csv(file_bytes: bytes) -> pd.DataFrame:
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValidationError(f"Could not parse file as CSV: {e}")
    if df.empty:
        raise ValidationError("CSV contains no data rows.")
    df.columns = [c.strip().lower() for c in df.columns]
    return df


def _to_float(v):
    try:
        f = float(v)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None


def run_simulation(df: pd.DataFrame, engine_id: str = "PX-001") -> dict:
    df, parsed_ts, quality, val_result = run_validation(df)

    n = len(df)
    sensor_values_rows: List[Dict[str, Optional[float]]] = []
    quality_rows: List[Dict[str, str]] = []
    regimes: List[str] = []
    timestamps: List[str] = []

    for i in df.index:
        row_values = {}
        row_quality = {}
        for col in SENSOR_COLUMNS:
            raw = df.at[i, col] if col in df.columns else None
            q = quality.at[i, col]
            row_quality[col] = q
            row_values[col] = _to_float(raw) if q in ("VALID", "SUSPECT") else None
        sensor_values_rows.append(row_values)
        quality_rows.append(row_quality)
        regimes.append(classify_regime(row_values.get("rpm")))
        ts = parsed_ts.loc[i]
        timestamps.append(str(ts) if pd.notna(ts) else f"row_{i}")

    # ---- Health model per row ----
    health_results = [
        compute_row_health(sensor_values_rows[i], quality_rows[i]) for i in range(n)
    ]
    health_values: List[Optional[float]] = [h["overall_score"] for h in health_results]

    # ---- Trend ----
    trend_series = compute_trend_series(health_values)
    trend_summary = summarize_trend(health_values)

    # ---- Row-level data-quality flag (for state-machine overlay) ----
    row_has_quality_issue = []
    for i in range(n):
        issues = [q for q in quality_rows[i].values() if q in ("INVALID", "SUSPECT")]
        row_has_quality_issue.append(len(issues) >= 2)  # multiple bad sensors this row

    # ---- State machine ----
    state_series = compute_state_series(health_values, row_has_quality_issue)

    # ---- Anomalies ----
    anomalies = detect_anomalies(sensor_values_rows, quality_rows, regimes)

    # ---- Alerts (derived from anomalies + state transitions) ----
    alerts = _build_alerts(anomalies, state_series, timestamps)

    # ---- Contribution / explainability (based on latest usable row) ----
    contributors = _rank_contributors(health_results)

    # ---- Data Quality Score ----
    data_quality = _compute_data_quality(val_result, quality_rows, n)

    # ---- Telemetry rows for API ----
    telemetry = []
    for i in range(n):
        telemetry.append({
            "index": i,
            "timestamp": timestamps[i],
            "rpm": sensor_values_rows[i]["rpm"],
            "temperature": sensor_values_rows[i]["temperature"],
            "oil_pressure": sensor_values_rows[i]["oil_pressure"],
            "vibration": sensor_values_rows[i]["vibration"],
            "fuel_rate": sensor_values_rows[i]["fuel_rate"],
            "regime": regimes[i],
            "quality_flags": quality_rows[i],
        })

    health_series = []
    for i in range(n):
        subsystems = [
            {**s, "score": (0.0 if s["score"] is None or (isinstance(s["score"], float) and math.isnan(s["score"])) else s["score"])}
            for s in health_results[i]["subsystems"]
        ]
        for s in subsystems:
            if math.isnan(s["deviation"]) if isinstance(s["deviation"], float) else False:
                s["deviation"] = 0.0
        health_series.append({
            "index": i,
            "timestamp": timestamps[i],
            "overall_score": health_values[i] if health_values[i] is not None else 0.0,
            "subsystems": subsystems,
        })

    state_series_out = [
        {"index": s["index"], "timestamp": timestamps[s["index"]], "state": s["state"], "raw_state": s["raw_state"]}
        for s in state_series
    ]

    anomalies_out = [
        {**a, "timestamp": timestamps[a["index"]]} for a in anomalies
    ]
    alerts_out = alerts

    latest_idx = n - 1
    latest_state = state_series_out[latest_idx]["state"] if state_series_out else "INSUFFICIENT_DATA"
    latest_snapshot = telemetry[latest_idx] if telemetry else {}

    primary = contributors[0]["subsystem"] if contributors else None
    secondary = contributors[1]["subsystem"] if len(contributors) > 1 else None

    summary = {
        "engine_id": engine_id,
        "current_health": trend_summary["current_health"] if trend_summary["current_health"] is not None else 0.0,
        "current_state": latest_state,
        "trend_direction": trend_summary["direction"],
        "telemetry_quality_score": data_quality["telemetry_quality_score"],
        "primary_contributor": primary,
        "secondary_contributor": secondary,
        "latest_snapshot": latest_snapshot,
    }

    return {
        "engine_id": engine_id,
        "summary": summary,
        "telemetry": telemetry,
        "health_series": health_series,
        "state_series": state_series_out,
        "alerts": alerts_out,
        "anomalies": anomalies_out,
        "contributors": contributors,
        "trend": trend_summary,
        "data_quality": data_quality,
        "model_info": {
            "mode": MODEL_CONFIG["mode"],
            "weights": MODEL_CONFIG["weights"],
            "state_thresholds": MODEL_CONFIG["state_thresholds"],
            "disclaimer": (
                "EngineTwin is a prototype demonstrating an explainable digital-twin-style "
                "operational state model using synthetic/sample telemetry. The Simulated "
                "Engine Health Index is a relative illustrative indicator and is not a "
                "certified measurement of aircraft or engine safety."
            ),
        },
        "_internal": {  # used by /api/what-if, stripped before returning to client if needed
            "sensor_values_rows": sensor_values_rows,
            "quality_rows": quality_rows,
        },
    }


def _build_alerts(anomalies: List[dict], state_series: List[dict], timestamps: List[str]) -> List[dict]:
    alerts = []
    for a in anomalies:
        severity = "WARNING" if a["category"] == "ENGINE_CONDITION" else "INFO"
        alerts.append({
            "index": a["index"],
            "timestamp": timestamps[a["index"]],
            "category": a["category"],
            "severity": severity,
            "message": a["detail"],
            "subsystem": a["sensor"],
        })

    prev_state = None
    for s in state_series:
        if prev_state is not None and s["state"] != prev_state:
            sev = "CRITICAL" if s["state"] in ("CRITICAL", "WARNING") else "INFO"
            category = "SENSOR_DATA_QUALITY" if s["state"] == "DATA_QUALITY_WARNING" else "ENGINE_CONDITION"
            alerts.append({
                "index": s["index"],
                "timestamp": timestamps[s["index"]],
                "category": category,
                "severity": sev,
                "message": f"Engine state transitioned from {prev_state} to {s['state']}.",
                "subsystem": None,
            })
        prev_state = s["state"]
    return alerts


def _rank_contributors(health_results: List[dict]) -> List[dict]:
    """Rank subsystems by their negative contribution to health at the most
    recent row that has a usable overall score."""
    usable = [h for h in health_results if h["overall_score"] is not None]
    if not usable:
        return []
    latest = usable[-1]
    ideal_contribution = {s["name"]: s["weight"] * 100 for s in latest["subsystems"]}
    ranked = []
    for s in latest["subsystems"]:
        if s["contribution"] == 0.0 and s["quality"] not in ("VALID", "SUSPECT"):
            continue
        shortfall = ideal_contribution[s["name"]] - s["contribution"]
        ranked.append({
            "subsystem": s["name"],
            "contribution": round(-shortfall, 2),
            "direction": "NEGATIVE" if shortfall > 0.01 else "POSITIVE",
        })
    ranked.sort(key=lambda c: c["contribution"])
    return ranked


def _compute_data_quality(val_result, quality_rows: List[Dict[str, str]], n: int) -> dict:
    total_cells = val_result.total_cells or 1
    missing_rate = val_result.missing_count / total_cells
    invalid_rate = val_result.invalid_count / total_cells
    suspicious_rate = val_result.suspicious_count / total_cells
    duplicate_rate = val_result.duplicate_count / max(n, 1)

    penalty = (
        missing_rate * 40
        + invalid_rate * 45
        + suspicious_rate * 20
        + duplicate_rate * 15
    )
    score = max(0.0, min(100.0, 100.0 - penalty))

    valid_rows = sum(
        1 for row in quality_rows
        if all(q in ("VALID", "SUSPECT") for q in row.values())
    )

    insufficient = val_result.insufficient_data or score < DQ_CFG["insufficient_quality_score"]

    return {
        "telemetry_quality_score": round(score, 1),
        "total_rows": n,
        "valid_rows": valid_rows,
        "missing_value_rate": round(missing_rate, 4),
        "duplicate_rate": round(duplicate_rate, 4),
        "invalid_value_rate": round(invalid_rate, 4),
        "suspicious_value_rate": round(suspicious_rate, 4),
        "notes": val_result.notes,
        "insufficient_data": insufficient,
    }


def apply_what_if(sim: dict, row_index: Optional[int], deltas: Dict[str, float]) -> dict:
    """Recompute health for a single row with deltas applied to its sensor
    values, and compare against the baseline for that row."""
    internal = sim["_internal"]
    rows = internal["sensor_values_rows"]
    quality_rows = internal["quality_rows"]

    if not rows:
        raise ValueError("No telemetry available for scenario analysis.")

    idx = row_index if row_index is not None else len(rows) - 1
    idx = max(0, min(idx, len(rows) - 1))

    baseline_values = rows[idx]
    baseline_quality = quality_rows[idx]
    baseline_result = compute_row_health(baseline_values, baseline_quality)

    scenario_values = dict(baseline_values)
    for key, delta_key in [
        ("rpm", "rpm_delta"), ("temperature", "temperature_delta"),
        ("oil_pressure", "oil_pressure_delta"), ("vibration", "vibration_delta"),
        ("fuel_rate", "fuel_rate_delta"),
    ]:
        if scenario_values.get(key) is not None:
            scenario_values[key] = scenario_values[key] + deltas.get(delta_key, 0.0)

    scenario_result = compute_row_health(scenario_values, baseline_quality)

    from state_model import _raw_state_for_score
    baseline_score = baseline_result["overall_score"] or 0.0
    scenario_score = scenario_result["overall_score"] or 0.0
    baseline_state = _raw_state_for_score(baseline_result["overall_score"])
    scenario_state = _raw_state_for_score(scenario_result["overall_score"])

    subsystem_deltas = []
    for b, s in zip(baseline_result["subsystems"], scenario_result["subsystems"]):
        b_score = b["score"] if b["score"] is not None else 0.0
        s_score = s["score"] if s["score"] is not None else 0.0
        subsystem_deltas.append({
            "subsystem": b["name"],
            "baseline_score": b_score,
            "scenario_score": s_score,
            "delta": round(s_score - b_score, 2),
        })
    subsystem_deltas.sort(key=lambda d: d["delta"])
    primary = subsystem_deltas[0]["subsystem"] if subsystem_deltas and subsystem_deltas[0]["delta"] < -0.01 else None

    return {
        "baseline_health": round(baseline_score, 2),
        "baseline_state": baseline_state,
        "scenario_health": round(scenario_score, 2),
        "scenario_state": scenario_state,
        "delta": round(scenario_score - baseline_score, 2),
        "state_transition": f"{baseline_state} -> {scenario_state}",
        "primary_affected_subsystem": primary,
        "subsystem_deltas": subsystem_deltas,
        "disclaimer": "Illustrative model experiment - not a guaranteed future behavior or failure prediction.",
    }
