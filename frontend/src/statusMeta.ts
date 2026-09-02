import type { EngineState, AlertSeverity } from './types/engine'

export const STATE_META: Record<EngineState, { label: string; color: string }> = {
  HEALTHY: { label: 'Healthy', color: 'var(--state-healthy)' },
  NORMAL: { label: 'Normal', color: 'var(--state-normal)' },
  DEGRADING: { label: 'Degrading', color: 'var(--state-degrading)' },
  WARNING: { label: 'Warning', color: 'var(--state-warning)' },
  CRITICAL: { label: 'Critical', color: 'var(--state-critical)' },
  DATA_QUALITY_WARNING: { label: 'Data quality warning', color: 'var(--state-dataquality)' },
  INSUFFICIENT_DATA: { label: 'Insufficient data', color: 'var(--state-insufficient)' },
}

export const SEVERITY_META: Record<AlertSeverity, { label: string; color: string }> = {
  INFO: { label: 'Info', color: 'var(--state-normal)' },
  WARNING: { label: 'Warning', color: 'var(--state-warning)' },
  CRITICAL: { label: 'Critical', color: 'var(--state-critical)' },
}

export const TREND_META: Record<string, { label: string; symbol: string }> = {
  STABLE: { label: 'Stable', symbol: '→' },
  IMPROVING: { label: 'Improving', symbol: '↑' },
  DETERIORATING: { label: 'Deteriorating', symbol: '↓' },
  RAPID_DETERIORATION: { label: 'Rapid deterioration', symbol: '↓↓' },
}

export function subsystemLabel(name: string): string {
  const map: Record<string, string> = {
    thermal: 'Thermal',
    lubrication: 'Lubrication',
    mechanical: 'Mechanical',
    operating: 'Operating',
    efficiency: 'Efficiency',
  }
  return map[name] ?? name
}
