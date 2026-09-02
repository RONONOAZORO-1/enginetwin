import { useState } from 'react'
import type { SimulationResponse, WhatIfResponse } from '../types/engine'
import { whatIf } from '../services/api'
import { STATE_META, subsystemLabel } from '../statusMeta'
import StatusChip from './StatusChip'

interface Props {
  data: SimulationResponse
}

interface SliderDef {
  key: 'rpm_delta' | 'temperature_delta' | 'oil_pressure_delta' | 'vibration_delta' | 'fuel_rate_delta'
  label: string
  min: number
  max: number
  step: number
  unit: string
}

const SLIDERS: SliderDef[] = [
  { key: 'rpm_delta', label: 'RPM change', min: -1000, max: 1000, step: 25, unit: 'rpm' },
  { key: 'temperature_delta', label: 'Temperature change', min: -30, max: 60, step: 1, unit: '°C' },
  { key: 'oil_pressure_delta', label: 'Oil pressure change', min: -25, max: 15, step: 0.5, unit: 'psi' },
  { key: 'vibration_delta', label: 'Vibration change', min: -1, max: 5, step: 0.1, unit: 'g' },
  { key: 'fuel_rate_delta', label: 'Fuel rate change', min: -5, max: 8, step: 0.2, unit: 'L/min' },
]

const ZERO_DELTAS = {
  rpm_delta: 0, temperature_delta: 0, oil_pressure_delta: 0, vibration_delta: 0, fuel_rate_delta: 0,
}

export default function ScenarioAnalysis({ data }: Props) {
  const [deltas, setDeltas] = useState({ ...ZERO_DELTAS })
  const [rowIndex, setRowIndex] = useState<number>(data.telemetry.length - 1)
  const [result, setResult] = useState<WhatIfResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runScenario() {
    setLoading(true)
    setError(null)
    try {
      const res = await whatIf(data.session_id, { row_index: rowIndex, ...deltas })
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scenario simulation failed.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setDeltas({ ...ZERO_DELTAS })
    setResult(null)
    setError(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ borderColor: 'var(--accent-dim)' }}>
        <div className="card-title">What-if / scenario analysis <span style={{ color: 'var(--text-2)' }}>— illustrative model experiment, not a failure prediction</span></div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12.5, color: 'var(--text-1)' }}>
            Base row: <span className="mono">{rowIndex}</span> of {data.telemetry.length - 1}
          </label>
          <input
            type="range" min={0} max={data.telemetry.length - 1} value={rowIndex}
            onChange={(e) => { setRowIndex(Number(e.target.value)); setResult(null) }}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {SLIDERS.map((s) => (
            <div key={s.key}>
              <label style={{ fontSize: 12.5, color: 'var(--text-1)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{s.label}</span>
                <span className="mono">{deltas[s.key] > 0 ? '+' : ''}{deltas[s.key]} {s.unit}</span>
              </label>
              <input
                type="range" min={s.min} max={s.max} step={s.step} value={deltas[s.key]}
                onChange={(e) => setDeltas((d) => ({ ...d, [s.key]: Number(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={runScenario}
            disabled={loading}
            style={{
              background: 'var(--accent)', color: 'var(--bg-0)', border: 'none',
              borderRadius: 4, padding: '8px 16px', fontWeight: 600, fontSize: 13,
            }}
          >
            {loading ? 'Running…' : 'Run scenario'}
          </button>
          <button
            onClick={reset}
            style={{
              background: 'transparent', color: 'var(--text-1)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '8px 16px', fontSize: 13,
            }}
          >
            Reset
          </button>
        </div>
        {error && <div style={{ color: 'var(--state-critical)', fontSize: 12.5, marginTop: 10 }}>{error}</div>}
      </div>

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-title">Baseline</div>
            <div className="mono" style={{ fontSize: 24, fontWeight: 600 }}>{result.baseline_health.toFixed(1)}</div>
            <div style={{ marginTop: 8 }}>
              <StatusChip color={STATE_META[result.baseline_state].color} label={STATE_META[result.baseline_state].label} />
            </div>
          </div>
          <div className="card">
            <div className="card-title">Scenario</div>
            <div className="mono" style={{ fontSize: 24, fontWeight: 600 }}>{result.scenario_health.toFixed(1)}</div>
            <div style={{ marginTop: 8 }}>
              <StatusChip color={STATE_META[result.scenario_state].color} label={STATE_META[result.scenario_state].label} />
            </div>
          </div>
          <div className="card">
            <div className="card-title">Change</div>
            <div className="mono" style={{ fontSize: 24, fontWeight: 600, color: result.delta < 0 ? 'var(--state-warning)' : 'var(--state-healthy)' }}>
              {result.delta > 0 ? '+' : ''}{result.delta.toFixed(1)} pts
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-1)', marginTop: 8 }} className="mono">
              {result.state_transition.replace('->', '→')}
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-title">
              Primary affected subsystem: {result.primary_affected_subsystem ? subsystemLabel(result.primary_affected_subsystem) : 'None'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 8 }}>
              {result.subsystem_deltas.map((d) => (
                <div key={d.subsystem} style={{ padding: '8px 10px', background: 'var(--bg-3)', borderRadius: 4 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{subsystemLabel(d.subsystem)}</div>
                  <div className="mono" style={{ fontSize: 14, marginTop: 3 }}>
                    {d.baseline_score.toFixed(0)} → {d.scenario_score.toFixed(0)}
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: d.delta < 0 ? 'var(--state-warning)' : 'var(--state-healthy)' }}>
                    {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 12 }}>{result.disclaimer}</div>
          </div>
        </div>
      )}
    </div>
  )
}
