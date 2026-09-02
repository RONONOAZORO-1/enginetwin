"""
Central, transparent configuration for the EngineTwin simplified state model.

Every threshold and weight here is a PROTOTYPE ASSUMPTION, not a certified
engineering limit. They are intentionally centralized and exposed via
GET /api/model-config so users/judges can inspect exactly what drives the
Simulated Engine Health Index.
"""
from __future__ import annotations

REQUIRED_COLUMNS = [
    "timestamp",
    "rpm",
    "temperature",
    "oil_pressure",
    "vibration",
    "fuel_rate",
]

MODEL_CONFIG = {
    "mode": "Prototype / Illustrative",

    # Subsystem weights MUST sum to 1.0 - validated at startup.
    "weights": {
        "thermal": 0.25,
        "lubrication": 0.25,
        "mechanical": 0.30,
        "operating": 0.10,
        "efficiency": 0.10,
    },

    # RPM-based operating regimes (assumed, configurable).
    "regime_ranges": {
        "LOW": (0, 1200),
        "NORMAL": (1200, 3200),
        "HIGH": (3200, 8000),
    },

    # Expected sensor envelopes per operating regime.
    # Each envelope is (expected_min, expected_max) used to compute a
    # context-adjusted deviation rather than penalizing raw sensor values.
    "expected_envelopes": {
        "LOW": {
            "temperature": (60, 90),
            "oil_pressure": (25, 45),
            "vibration": (0.0, 1.2),
            "fuel_rate": (1.0, 4.0),
        },
        "NORMAL": {
            "temperature": (80, 110),
            "oil_pressure": (30, 55),
            "vibration": (0.0, 2.0),
            "fuel_rate": (3.0, 9.0),
        },
        "HIGH": {
            "temperature": (95, 130),
            "oil_pressure": (35, 65),
            "vibration": (0.0, 3.2),
            "fuel_rate": (7.0, 16.0),
        },
    },

    # Physically implausible bounds used by the validation layer
    # (not the same as the "expected envelope" used for scoring).
    "physical_bounds": {
        "rpm": (0, 9000),
        "temperature": (-40, 400),
        "oil_pressure": (0, 150),
        "vibration": (0, 50),
        "fuel_rate": (0, 60),
    },

    # State machine thresholds on the 0-100 Simulated Engine Health Index.
    "state_thresholds": {
        "HEALTHY": 90,
        "NORMAL": 75,
        "DEGRADING": 55,
        "WARNING": 35,
        # below WARNING => CRITICAL
    },

    # Hysteresis / persistence: number of consecutive rows a condition
    # must hold before the state machine transitions, to avoid noise-driven
    # flapping between states.
    "persistence": {
        "degrade_confirm_rows": 4,
        "recover_confirm_rows": 5,
        "critical_confirm_rows": 3,
    },

    "trend": {
        "rolling_window": 8,
        "stable_slope_threshold": 0.15,     # |slope| below this => STABLE
        "rapid_slope_threshold": 1.2,       # |slope| above this => RAPID
    },

    "anomaly": {
        "rolling_window": 10,
        "z_score_threshold": 3.0,
        "rate_of_change_sigma": 4.0,
        "min_history_for_zscore": 6,
    },

    "data_quality": {
        "suspect_z_threshold": 3.0,
        "insufficient_rows": 5,
        "insufficient_quality_score": 30,
    },
}


def validate_model_config(cfg: dict = MODEL_CONFIG) -> None:
    weights = cfg["weights"]
    total = sum(weights.values())
    if abs(total - 1.0) > 1e-6:
        raise ValueError(
            f"MODEL_CONFIG weights must sum to 1.0, got {total:.6f}. "
            f"Refusing to start with a misconfigured health model."
        )
    for regime, (lo, hi) in cfg["regime_ranges"].items():
        if lo >= hi:
            raise ValueError(f"Invalid regime range for {regime}: ({lo}, {hi})")


# Fail fast at import time - a misconfigured model must never silently run.
validate_model_config()
