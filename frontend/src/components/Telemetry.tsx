import { useState } from 'react'
import type { SimulationResponse } from '../types/engine'
import SensorCharts from './SensorCharts'

interface Props {
  data: SimulationResponse
}

const QUALITY_COLOR: Record<string, string> = {
  VALID: 'var(--text-1)',
  MISSING: 'var(--state-insufficient)',
  SUSPECT: 'var(--state-degrading)',
  INVALID: 'var(--state-critical)',
}

export default function Telemetry({ data }: Props) {
  const [selected, setSelected] = useState<number>(data.telemetry.length - 1)
  const rows = data.telemetry.slice(Math.max(0, selected - 6), selected + 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SensorCharts telemetry={data.telemetry} selectedIndex={selected} onSelect={setSelected} />

      <div className="card">
        <div className="card-title">
          Raw sensor table <span style={{ color: 'var(--text-2)' }}>(row {selected} selected — click a chart to change)</span>
        </div>
        <div className="scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '6px 8px' }}>Row</th>
                <th style={{ padding: '6px 8px' }}>Timestamp</th>
                <th style={{ padding: '6px 8px' }}>Regime</th>
                <th style={{ padding: '6px 8px' }}>RPM</th>
                <th style={{ padding: '6px 8px' }}>Temp</th>
                <th style={{ padding: '6px 8px' }}>Oil press.</th>
                <th style={{ padding: '6px 8px' }}>Vibration</th>
                <th style={{ padding: '6px 8px' }}>Fuel rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.index}
                  className="mono"
                  onClick={() => setSelected(r.index)}
                  style={{
                    cursor: 'pointer',
                    background: r.index === selected ? 'var(--bg-3)' : 'transparent',
                    borderBottom: '1px solid var(--border-soft)',
                  }}
                >
                  <td style={{ padding: '6px 8px' }}>{r.index}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-2)' }}>{r.timestamp}</td>
                  <td style={{ padding: '6px 8px' }}>{r.regime}</td>
                  {(['rpm', 'temperature', 'oil_pressure', 'vibration', 'fuel_rate'] as const).map((k) => (
                    <td key={k} style={{ padding: '6px 8px', color: QUALITY_COLOR[r.quality_flags[k]] ?? 'var(--text-1)' }}>
                      {r[k] === null ? '—' : r[k]}
                      {r.quality_flags[k] !== 'VALID' && (
                        <span style={{ fontSize: 10, marginLeft: 4 }}>({r.quality_flags[k]})</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
