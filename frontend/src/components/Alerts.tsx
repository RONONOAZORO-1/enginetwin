import type { AlertItem } from '../types/engine'
import { SEVERITY_META } from '../statusMeta'

interface Props {
  alerts: AlertItem[]
  limit?: number
  split?: boolean
}

function AlertRow({ a }: { a: AlertItem }) {
  const meta = SEVERITY_META[a.severity]
  return (
    <div
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        padding: '9px 0', borderBottom: '1px solid var(--border-soft)',
      }}
    >
      <span className="status-dot" style={{ background: meta.color, marginTop: 6 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13 }}>{a.message}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
          row {a.index} · {a.timestamp}
        </div>
      </div>
    </div>
  )
}

export default function Alerts({ alerts, limit, split = false }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Alerts</div>
        <div style={{ color: 'var(--text-2)', fontSize: 13 }}>No alerts for this dataset.</div>
      </div>
    )
  }

  if (!split) {
    const shown = limit ? alerts.slice(0, limit) : alerts
    return (
      <div className="card">
        <div className="card-title">Alerts ({alerts.length})</div>
        <div className="scrollbar" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {shown.map((a, i) => <AlertRow key={i} a={a} />)}
        </div>
      </div>
    )
  }

  const engineAlerts = alerts.filter((a) => a.category === 'ENGINE_CONDITION')
  const sensorAlerts = alerts.filter((a) => a.category === 'SENSOR_DATA_QUALITY')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div className="card">
        <div className="card-title">Engine-condition alerts ({engineAlerts.length})</div>
        <div className="scrollbar" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {engineAlerts.length === 0
            ? <div style={{ color: 'var(--text-2)', fontSize: 13 }}>None detected.</div>
            : engineAlerts.map((a, i) => <AlertRow key={i} a={a} />)}
        </div>
      </div>
      <div className="card">
        <div className="card-title">Sensor / data-quality alerts ({sensorAlerts.length})</div>
        <div className="scrollbar" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {sensorAlerts.length === 0
            ? <div style={{ color: 'var(--text-2)', fontSize: 13 }}>None detected.</div>
            : sensorAlerts.map((a, i) => <AlertRow key={i} a={a} />)}
        </div>
      </div>
    </div>
  )
}
