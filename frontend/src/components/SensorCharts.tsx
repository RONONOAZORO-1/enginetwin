import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { TelemetryRow } from '../types/engine'

interface SensorDef {
  key: keyof TelemetryRow
  label: string
  unit: string
  color: string
}

const SENSORS: SensorDef[] = [
  { key: 'rpm', label: 'RPM', unit: 'rpm', color: '#5b8def' },
  { key: 'temperature', label: 'Temperature', unit: '°C', color: '#e08a3c' },
  { key: 'oil_pressure', label: 'Oil pressure', unit: 'psi', color: '#4caf6d' },
  { key: 'vibration', label: 'Vibration', unit: 'g', color: '#e0524a' },
  { key: 'fuel_rate', label: 'Fuel rate', unit: 'L/min', color: '#a487d9' },
]

interface Props {
  telemetry: TelemetryRow[]
  selectedIndex?: number
  onSelect?: (index: number) => void
}

export default function SensorCharts({ telemetry, selectedIndex, onSelect }: Props) {
  const data = telemetry.map((row) => ({
    index: row.index,
    rpm: row.rpm,
    temperature: row.temperature,
    oil_pressure: row.oil_pressure,
    vibration: row.vibration,
    fuel_rate: row.fuel_rate,
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {SENSORS.map((s) => (
        <div key={s.key} className="card" style={{ cursor: onSelect ? 'crosshair' : 'default' }}>
          <div className="card-title">{s.label} <span style={{ color: 'var(--text-2)' }}>({s.unit})</span></div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart
              data={data}
              margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
              onClick={(state) => {
                if (onSelect && state && state.activeLabel !== undefined) {
                  onSelect(Number(state.activeLabel))
                }
              }}
            >
              <CartesianGrid stroke="var(--border-soft)" vertical={false} />
              <XAxis dataKey="index" stroke="var(--text-2)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <YAxis stroke="var(--text-2)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} width={30} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12 }}
                labelFormatter={(v) => `Row ${v}`}
              />
              <Line type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={1.75} dot={false} connectNulls />
              {selectedIndex !== undefined && (
                <ReferenceLine x={selectedIndex} stroke="var(--text-0)" strokeDasharray="3 3" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
