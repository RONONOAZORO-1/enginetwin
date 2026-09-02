import { Fragment } from 'react'
import type { DataQuality as DataQualityType } from '../types/engine'

interface Props {
  dataQuality: DataQualityType
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

export default function DataQuality({ dataQuality }: Props) {
  const rows: { label: string; value: string }[] = [
    { label: 'Total rows', value: String(dataQuality.total_rows) },
    { label: 'Fully valid rows', value: String(dataQuality.valid_rows) },
    { label: 'Missing-value rate', value: pct(dataQuality.missing_value_rate) },
    { label: 'Invalid-value rate', value: pct(dataQuality.invalid_value_rate) },
    { label: 'Suspicious-value rate', value: pct(dataQuality.suspicious_value_rate) },
    { label: 'Duplicate-timestamp rate', value: pct(dataQuality.duplicate_rate) },
  ]

  return (
    <div className="card">
      <div className="card-title">Telemetry quality</div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 600, marginBottom: 10 }}>
        {dataQuality.telemetry_quality_score.toFixed(0)} <span style={{ fontSize: 14, color: 'var(--text-2)' }}>/ 100</span>
      </div>
      {dataQuality.insufficient_data && (
        <div style={{
          background: 'var(--state-insufficient)22', border: '1px solid var(--state-insufficient)55',
          borderRadius: 4, padding: '6px 10px', fontSize: 12.5, marginBottom: 10, color: 'var(--text-0)',
        }}>
          Insufficient data - simulated health may not be reliable for this file.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 12.5 }}>
        {rows.map((r) => (
          <Fragment key={r.label}>
            <span style={{ color: 'var(--text-1)' }}>{r.label}</span>
            <span className="mono" style={{ textAlign: 'right' }}>{r.value}</span>
          </Fragment>
        ))}
      </div>
      {dataQuality.notes.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
          {dataQuality.notes.map((n, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>· {n}</div>
          ))}
        </div>
      )}
    </div>
  )
}
