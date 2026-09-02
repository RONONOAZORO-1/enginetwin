import { useState } from 'react'
import type { SimulationResponse } from '../types/engine'
import Engine3D from './Engine3D'
import StatusChip from './StatusChip'
import { STATE_META } from '../statusMeta'

interface Props {
  data: SimulationResponse
}

export default function DigitalTwin({ data }: Props) {
  const [index, setIndex] = useState(data.telemetry.length - 1)
  const row = data.telemetry[index]
  const stateRow = data.state_series[index]
  const healthRow = data.health_series[index]
  const stateMeta = STATE_META[stateRow?.state ?? 'INSUFFICIENT_DATA']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
        <Engine3D rpm={row?.rpm ?? null} state={stateRow?.state ?? 'INSUFFICIENT_DATA'} />

        <div className="card">
          <div className="card-title">Virtual engine state — row {index}</div>
          <div style={{ marginBottom: 12 }}>
            <StatusChip color={stateMeta.color} label={stateMeta.label} />
          </div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 600, marginBottom: 14 }}>
            {healthRow ? healthRow.overall_score.toFixed(1) : '—'} <span style={{ fontSize: 14, color: 'var(--text-2)' }}>/ 100</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
            {[
              ['RPM', row?.rpm, ''],
              ['Temperature', row?.temperature, '°C'],
              ['Oil pressure', row?.oil_pressure, 'psi'],
              ['Vibration', row?.vibration, 'g'],
              ['Fuel rate', row?.fuel_rate, 'L/min'],
              ['Regime', row?.regime, ''],
            ].map(([label, value, unit]) => (
              <div key={label as string}>
                <div style={{ color: 'var(--text-2)' }}>{label}</div>
                <div className="mono" style={{ fontSize: 14, marginTop: 2 }}>
                  {value === null || value === undefined ? '—' : `${value} ${unit}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Telemetry time — drag to scrub the digital twin</div>
        <input
          type="range" min={0} max={data.telemetry.length - 1} value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', marginTop: 4 }} className="mono">
          <span>{data.telemetry[0]?.timestamp}</span>
          <span>{data.telemetry[data.telemetry.length - 1]?.timestamp}</span>
        </div>
      </div>
    </div>
  )
}
