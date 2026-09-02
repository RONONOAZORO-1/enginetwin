"""
Preprocessing / operating-condition context.

Derives an operating regime (LOW / NORMAL / HIGH) from RPM and produces the
expected sensor envelope for that regime. This is a SIMPLIFIED CONTEXTUAL
MODEL, not a real thermodynamic simulation - it exists to prevent the naive
mistake of treating "RPM went up, temperature went up" as automatic failure.
"""
from __future__ import annotations
from typing import Optional, Tuple
import math
from config import MODEL_CONFIG


def classify_regime(rpm: Optional[float]) -> str:
    if rpm is None or (isinstance(rpm, float) and math.isnan(rpm)):
        return "NORMAL"  # fall back to the broadest common regime
    for regime, (lo, hi) in MODEL_CONFIG["regime_ranges"].items():
        if lo <= rpm < hi:
            return regime
    # above the top of HIGH range
    return "HIGH"


def expected_envelope(regime: str, sensor: str) -> Optional[Tuple[float, float]]:
    return MODEL_CONFIG["expected_envelopes"].get(regime, {}).get(sensor)


def context_deviation(regime: str, sensor: str, value: Optional[float]) -> Optional[float]:
    """
    Returns a normalized deviation in [0, 1+] representing how far `value`
    sits outside the expected envelope for the given regime.
    0   => fully inside the expected envelope
    >0  => proportion of the envelope width the value sits beyond the edge
    None if value/envelope unavailable (caller must treat as MISSING).
    """
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    env = expected_envelope(regime, sensor)
    if env is None:
        return 0.0
    lo, hi = env
    width = max(hi - lo, 1e-6)
    if value < lo:
        return (lo - value) / width
    if value > hi:
        return (value - hi) / width
    return 0.0
