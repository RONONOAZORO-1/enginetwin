"""
Explicit state machine over the health-index series, with hysteresis
(persistence) so a single noisy row cannot flip the state.
"""
from __future__ import annotations
from typing import List, Optional
from config import MODEL_CONFIG

THRESHOLDS = MODEL_CONFIG["state_thresholds"]
PERSIST = MODEL_CONFIG["persistence"]

STATE_ORDER = ["CRITICAL", "WARNING", "DEGRADING", "NORMAL", "HEALTHY"]


def _raw_state_for_score(score: Optional[float]) -> str:
    if score is None:
        return "INSUFFICIENT_DATA"
    if score >= THRESHOLDS["HEALTHY"]:
        return "HEALTHY"
    if score >= THRESHOLDS["NORMAL"]:
        return "NORMAL"
    if score >= THRESHOLDS["DEGRADING"]:
        return "DEGRADING"
    if score >= THRESHOLDS["WARNING"]:
        return "WARNING"
    return "CRITICAL"


def _severity_rank(state: str) -> int:
    # Higher = worse. Used to decide whether a transition is a "worsening".
    order = {"HEALTHY": 0, "NORMAL": 1, "DEGRADING": 2, "WARNING": 3, "CRITICAL": 4,
             "DATA_QUALITY_WARNING": 2, "INSUFFICIENT_DATA": 2}
    return order.get(state, 2)


def compute_state_series(
    health_values: List[Optional[float]],
    quality_flags_per_row: List[bool],
) -> List[dict]:
    """
    quality_flags_per_row[i] = True if row i has a data-quality problem
    severe enough to raise a DATA_QUALITY_WARNING overlay.

    Returns list of {index, raw_state, state} applying persistence so the
    *confirmed* state only changes after the raw state has been consistently
    worse (or better) for the configured number of rows.
    """
    raw_states = [_raw_state_for_score(v) for v in health_values]

    confirmed_states: List[str] = []
    current_confirmed = raw_states[0] if raw_states else "INSUFFICIENT_DATA"
    worsening_streak = 0
    improving_streak = 0

    for i, raw in enumerate(raw_states):
        if quality_flags_per_row[i] and raw not in ("INSUFFICIENT_DATA",):
            candidate_confirmed = "DATA_QUALITY_WARNING"
        else:
            candidate_confirmed = None

        if candidate_confirmed is None:
            if _severity_rank(raw) > _severity_rank(current_confirmed):
                worsening_streak += 1
                improving_streak = 0
            elif _severity_rank(raw) < _severity_rank(current_confirmed):
                improving_streak += 1
                worsening_streak = 0
            else:
                worsening_streak = 0
                improving_streak = 0

            required_worse = (
                PERSIST["critical_confirm_rows"] if raw == "CRITICAL"
                else PERSIST["degrade_confirm_rows"]
            )

            if worsening_streak >= required_worse:
                current_confirmed = raw
                worsening_streak = 0
            elif improving_streak >= PERSIST["recover_confirm_rows"]:
                current_confirmed = raw
                improving_streak = 0
        else:
            current_confirmed = candidate_confirmed
            worsening_streak = 0
            improving_streak = 0

        confirmed_states.append(current_confirmed)

    return [
        {"index": i, "raw_state": raw_states[i], "state": confirmed_states[i]}
        for i in range(len(raw_states))
    ]
