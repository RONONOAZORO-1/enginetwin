import type { SimulationResponse } from '../types/engine'
import Contributions from './Contributions'
import Alerts from './Alerts'
import { TREND_META, subsystemLabel } from '../statusMeta'

interface Props {
  data: SimulationResponse
}

export default function Analysis({ data }: Props) {
  const latestHealth = data.health_series[data.health_series.length - 1]
  const trendMeta = TREND_META[data.trend.direction] ?? TREND_META.STABLE

  const anomalyAlerts = data.anomalies.map((a) => ({
    index: a.index,
    timestamp: a.timestamp,
    category: a.category,
    severity: (a.category === 'ENGINE_CONDITION' ? 'WARNING' : 'INFO') as 'WARNING' | 'INFO',
    message: a.detail,
    subsystem: a.sensor,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <div className="card-title">Health decomposition (latest row)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {latestHealth?.subsystems.map((s) => (
            <div key={s.name} style={{ padding: '10px 12px', background: 'var(--bg-3)', borderRadius: 4 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginBottom: 4 }}>{subsystemLabel(s.name)}</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
                {isNaN(s.score) ? '—' : s.score.toFixed(0)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{s.status.toLowerCase()}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 2 }}>weight {(s.weight * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Contributions contributors={data.contributors} />

        <div className="card">
          <div className="card-title">Trend</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
            <span className="mono" style={{ marginRight: 8 }}>{trendMeta.symbol}</span>{trendMeta.label}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5, marginTop: 14 }}>
            <div>
              <div style={{ color: 'var(--text-2)' }}>Current health</div>
              <div className="mono" style={{ fontSize: 15 }}>{data.trend.current_health?.toFixed(1) ?? '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-2)' }}>Previous health</div>
              <div className="mono" style={{ fontSize: 15 }}>{data.trend.previous_health?.toFixed(1) ?? '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-2)' }}>Rolling mean</div>
              <div className="mono" style={{ fontSize: 15 }}>{data.trend.rolling_mean?.toFixed(1) ?? '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-2)' }}>Rolling slope</div>
              <div className="mono" style={{ fontSize: 15 }}>{data.trend.rolling_slope.toFixed(3)}</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="card-title" style={{ marginBottom: 8 }}>Anomalies</div>
        <Alerts alerts={anomalyAlerts} split />
      </div>
    </div>
  )
}
