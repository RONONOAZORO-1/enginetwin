from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class SubsystemScore(BaseModel):
    name: str
    score: float
    status: str
    deviation: float
    weight: float
    contribution: float
    quality: str  # VALID / MISSING / SUSPECT / INVALID / PARTIAL


class TelemetryRow(BaseModel):
    index: int
    timestamp: str
    rpm: Optional[float] = None
    temperature: Optional[float] = None
    oil_pressure: Optional[float] = None
    vibration: Optional[float] = None
    fuel_rate: Optional[float] = None
    regime: str
    quality_flags: Dict[str, str]


class HealthPoint(BaseModel):
    index: int
    timestamp: str
    overall_score: float
    subsystems: List[SubsystemScore]


class StatePoint(BaseModel):
    index: int
    timestamp: str
    state: str
    raw_state: str


class Alert(BaseModel):
    index: int
    timestamp: str
    category: str  # SENSOR_DATA_QUALITY / ENGINE_CONDITION
    severity: str  # INFO / WARNING / CRITICAL
    message: str
    subsystem: Optional[str] = None


class Anomaly(BaseModel):
    index: int
    timestamp: str
    category: str  # SENSOR_DATA_QUALITY / ENGINE_CONDITION
    sensor: str
    method: str
    detail: str


class Contributor(BaseModel):
    subsystem: str
    contribution: float
    direction: str  # POSITIVE / NEGATIVE


class DataQuality(BaseModel):
    telemetry_quality_score: float
    total_rows: int
    valid_rows: int
    missing_value_rate: float
    duplicate_rate: float
    invalid_value_rate: float
    suspicious_value_rate: float
    notes: List[str]
    insufficient_data: bool


class TrendInfo(BaseModel):
    current_health: float
    previous_health: float
    rolling_mean: float
    rolling_slope: float
    direction: str
    degradation_rate: float


class Summary(BaseModel):
    engine_id: str
    current_health: float
    current_state: str
    trend_direction: str
    telemetry_quality_score: float
    primary_contributor: Optional[str] = None
    secondary_contributor: Optional[str] = None
    latest_snapshot: Dict[str, Any]


class SimulationResponse(BaseModel):
    engine_id: str
    summary: Summary
    telemetry: List[TelemetryRow]
    health_series: List[HealthPoint]
    state_series: List[StatePoint]
    alerts: List[Alert]
    anomalies: List[Anomaly]
    contributors: List[Contributor]
    trend: TrendInfo
    data_quality: DataQuality
    model_info: Dict[str, Any]


class WhatIfRequest(BaseModel):
    row_index: Optional[int] = None
    rpm_delta: float = 0.0
    temperature_delta: float = 0.0
    oil_pressure_delta: float = 0.0
    vibration_delta: float = 0.0
    fuel_rate_delta: float = 0.0


class WhatIfResponse(BaseModel):
    baseline_health: float
    baseline_state: str
    scenario_health: float
    scenario_state: str
    delta: float
    state_transition: str
    primary_affected_subsystem: Optional[str]
    subsystem_deltas: List[Dict[str, Any]]
    disclaimer: str
