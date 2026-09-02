import type { SimulationResponse } from '../types/engine'
import HealthSummary from './HealthSummary'
import HealthTrend from './HealthTrend'
import Alerts from './Alerts'
import Contributions from './Contributions'
import DataQuality from './DataQuality'

interface Props {
  data: SimulationResponse
}

export default function Overview({ data }: Props) {
  const snapshot = data.summary.latest_snapshot

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <HealthSummary summary={data.summary} trend={data.trend} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <HealthTrend healthSeries={data.health_series} />
        <DataQuality dataQuality={data.data_quality} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <Alerts alerts={data.alerts} limit={8} />
        <Contributions contributors={data.contributors} />
      </div>

      <div className="card">
        <div className="card-title">Latest telemetry snapshot</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            ['RPM', snapshot?.rpm, ''],
            ['Temperature', snapshot?.temperature, '°C'],
            ['Oil pressure', snapshot?.oil_pressure, 'psi'],
            ['Vibration', snapshot?.vibration, 'g'],
            ['Fuel rate', snapshot?.fuel_rate, 'L/min'],
          ].map(([label, value, unit]) => (
            <div key={label as string}>
              <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginBottom: 3 }}>{label}</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 500 }}>
                {value === null || value === undefined ? '—' : `${value} ${unit}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
