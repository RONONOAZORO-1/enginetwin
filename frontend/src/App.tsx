import { useState, useRef } from 'react'
import type { SimulationResponse } from './types/engine'
import { simulate, ApiError } from './services/api'
import Overview from './components/Overview'
import Telemetry from './components/Telemetry'
import DigitalTwin from './components/DigitalTwin'
import Analysis from './components/Analysis'
import ScenarioAnalysis from './components/ScenarioAnalysis'
import StateTimeline from './components/StateTimeline'

type Tab = 'overview' | 'telemetry' | 'twin' | 'analysis' | 'scenario'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'twin', label: 'Digital Twin' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'scenario', label: 'Scenario' },
]

const SAMPLE_FILES = [
  { name: 'Healthy engine', path: '/sample_data/healthy_engine.csv' },
  { name: 'Degrading engine', path: '/sample_data/degrading_engine.csv' },
  { name: 'Sensor fault', path: '/sample_data/sensor_fault.csv' },
]

export default function App() {
  const [data, setData] = useState<SimulationResponse | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    try {
      const res = await simulate(file, 'PX-001')
      setData(res)
      setTab('overview')
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Could not reach the EngineTwin backend. Is the API running?')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadSample(path: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(path)
      if (!res.ok) throw new Error('Sample file not found.')
      const blob = await res.blob()
      const file = new File([blob], path.split('/').pop() ?? 'sample.csv', { type: 'text/csv' })
      await handleFile(file)
    } catch {
      setError('Could not load the sample dataset.')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100%' }}>
      <aside style={{
        width: 220, borderRight: '1px solid var(--border)', background: 'var(--bg-1)',
        display: 'flex', flexDirection: 'column', padding: '18px 14px', flexShrink: 0,
      }}>
        <div style={{ marginBottom: 26, paddingLeft: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>EngineTwin</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>Digital-twin-style prototype</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              disabled={!data}
              style={{
                textAlign: 'left', padding: '9px 10px', borderRadius: 4, border: 'none',
                background: tab === t.id ? 'var(--bg-3)' : 'transparent',
                color: tab === t.id ? 'var(--text-0)' : 'var(--text-1)',
                fontSize: 13, opacity: data ? 1 : 0.4, cursor: data ? 'pointer' : 'not-allowed',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid var(--border-soft)' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{
              width: '100%', background: 'var(--accent)', color: 'var(--bg-0)', border: 'none',
              borderRadius: 4, padding: '9px 10px', fontWeight: 600, fontSize: 12.5, marginBottom: 10,
            }}
          >
            {loading ? 'Processing…' : 'Upload telemetry CSV'}
          </button>
          <input
            ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginBottom: 6 }}>Or try a sample:</div>
          {SAMPLE_FILES.map((s) => (
            <button
              key={s.path}
              onClick={() => loadSample(s.path)}
              disabled={loading}
              style={{
                width: '100%', textAlign: 'left', background: 'transparent', color: 'var(--text-1)',
                border: '1px solid var(--border)', borderRadius: 4, padding: '6px 9px',
                fontSize: 11.5, marginBottom: 5,
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </aside>

      <main style={{ flex: 1, padding: '22px 28px', overflowY: 'auto' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 6, paddingBottom: 14, borderBottom: '1px solid var(--border-soft)',
        }}>
          <div>
            <h1 style={{ fontSize: 17 }}>Explainable Piston Engine Digital-Twin-Style Monitoring</h1>
          </div>
          <span
            className="mono"
            style={{
              fontSize: 10.5, color: 'var(--text-2)', border: '1px solid var(--border)',
              borderRadius: 999, padding: '3px 10px',
            }}
          >
            MODEL MODE · PROTOTYPE / ILLUSTRATIVE
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 0, marginBottom: 20, maxWidth: 760 }}>
          EngineTwin demonstrates an explainable digital-twin-style operational state model using
          synthetic/sample telemetry. The Simulated Engine Health Index is a relative illustrative
          indicator, not a certified measurement of aircraft or engine safety.
        </p>

        {error && (
          <div style={{
            background: 'var(--state-critical)18', border: '1px solid var(--state-critical)55',
            borderRadius: 5, padding: '10px 14px', fontSize: 13, marginBottom: 18,
          }}>
            {error}
          </div>
        )}

        {!data && !loading && (
          <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 560, margin: '40px auto' }}>
            <div style={{ fontSize: 15, marginBottom: 8 }}>No telemetry loaded</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
              Upload a sensor-log CSV (timestamp, rpm, temperature, oil_pressure, vibration, fuel_rate)
              or try one of the sample datasets in the sidebar to see the simulated engine health trend.
            </div>
          </div>
        )}

        {loading && !data && (
          <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 560, margin: '40px auto', color: 'var(--text-2)' }}>
            Running simulation…
          </div>
        )}

        {data && (
          <>
            <div style={{ marginBottom: 14 }}>
              <StateTimeline stateSeries={data.state_series} />
            </div>
            {tab === 'overview' && <Overview data={data} />}
            {tab === 'telemetry' && <Telemetry data={data} />}
            {tab === 'twin' && <DigitalTwin data={data} />}
            {tab === 'analysis' && <Analysis data={data} />}
            {tab === 'scenario' && <ScenarioAnalysis data={data} />}
          </>
        )}
      </main>
    </div>
  )
}
