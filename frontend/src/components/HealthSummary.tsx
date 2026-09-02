import type { Summary, TrendInfo } from '../types/engine'
import { STATE_META, TREND_META } from '../statusMeta'
import StatusChip from './StatusChip'

interface Props {
  summary: Summary
  trend: TrendInfo
}

export default function HealthSummary({ summary, trend }: Props) {
  const stateMeta = STATE_META[summary.current_state]
  const trendMeta = TREND_META[summary.trend_direction] ?? TREND_META.STABLE

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
      <div className="card">
        <div className="card-title">Engine</div>
        <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{summary.engine_id}</div>
      </div>

      <div className="card">
        <div className="card-title">Simulated health</div>
        <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: stateMeta.color }}>
          {summary.current_health.toFixed(1)} <span style={{ fontSize: 13, color: 'var(--text-2)' }}>/ 100</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">State</div>
        <StatusChip color={stateMeta.color} label={stateMeta.label} />
      </div>

      <div className="card">
        <div className="card-title">Trend</div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>
          <span className="mono" style={{ marginRight: 6 }}>{trendMeta.symbol}</span>
          {trendMeta.label}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Telemetry quality</div>
        <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>
          {summary.telemetry_quality_score.toFixed(0)} <span style={{ fontSize: 13, color: 'var(--text-2)' }}>/ 100</span>
        </div>
      </div>
    </div>
  )
}
