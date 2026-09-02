export type SensorQuality = 'VALID' | 'MISSING' | 'SUSPECT' | 'INVALID'

export type EngineState =
  | 'HEALTHY'
  | 'NORMAL'
  | 'DEGRADING'
  | 'WARNING'
  | 'CRITICAL'
  | 'DATA_QUALITY_WARNING'
  | 'INSUFFICIENT_DATA'

export type TrendDirection = 'STABLE' | 'IMPROVING' | 'DETERIORATING' | 'RAPID_DETERIORATION'

export type AlertCategory = 'SENSOR_DATA_QUALITY' | 'ENGINE_CONDITION'
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface TelemetryRow {
  index: number
  timestamp: string
  rpm: number | null
  temperature: number | null
  oil_pressure: number | null
  vibration: number | null
  fuel_rate: number | null
  regime: 'LOW' | 'NORMAL' | 'HIGH'
  quality_flags: Record<string, SensorQuality>
}

export interface SubsystemScore {
  name: string
  score: number
  status: string
  deviation: number
  weight: number
  contribution: number
  quality: string
}

export interface HealthPoint {
  index: number
  timestamp: string
  overall_score: number
  subsystems: SubsystemScore[]
}

export interface StatePoint {
  index: number
  timestamp: string
  state: EngineState
  raw_state: EngineState
}

export interface AlertItem {
  index: number
  timestamp: string
  category: AlertCategory
  severity: AlertSeverity
  message: string
  subsystem: string | null
}

export interface AnomalyItem {
  index: number
  timestamp: string
  category: AlertCategory
  sensor: string
  method: string
  detail: string
}

export interface Contributor {
  subsystem: string
  contribution: number
  direction: 'POSITIVE' | 'NEGATIVE'
}

export interface DataQuality {
  telemetry_quality_score: number
  total_rows: number
  valid_rows: number
  missing_value_rate: number
  duplicate_rate: number
  invalid_value_rate: number
  suspicious_value_rate: number
  notes: string[]
  insufficient_data: boolean
}

export interface TrendInfo {
  current_health: number | null
  previous_health: number | null
  rolling_mean: number | null
  rolling_slope: number
  direction: TrendDirection
  degradation_rate: number
}

export interface Summary {
  engine_id: string
  current_health: number
  current_state: EngineState
  trend_direction: TrendDirection
  telemetry_quality_score: number
  primary_contributor: string | null
  secondary_contributor: string | null
  latest_snapshot: TelemetryRow
}

export interface ModelInfo {
  mode: string
  weights: Record<string, number>
  state_thresholds: Record<string, number>
  disclaimer: string
}

export interface SimulationResponse {
  session_id: string
  engine_id: string
  summary: Summary
  telemetry: TelemetryRow[]
  health_series: HealthPoint[]
  state_series: StatePoint[]
  alerts: AlertItem[]
  anomalies: AnomalyItem[]
  contributors: Contributor[]
  trend: TrendInfo
  data_quality: DataQuality
  model_info: ModelInfo
}

export interface WhatIfDeltas {
  row_index?: number | null
  rpm_delta: number
  temperature_delta: number
  oil_pressure_delta: number
  vibration_delta: number
  fuel_rate_delta: number
}

export interface SubsystemDelta {
  subsystem: string
  baseline_score: number
  scenario_score: number
  delta: number
}

export interface WhatIfResponse {
  baseline_health: number
  baseline_state: EngineState
  scenario_health: number
  scenario_state: EngineState
  delta: number
  state_transition: string
  primary_affected_subsystem: string | null
  subsystem_deltas: SubsystemDelta[]
  disclaimer: string
}
