import type { Contributor } from '../types/engine'
import { subsystemLabel } from '../statusMeta'

interface Props {
  contributors: Contributor[]
}

function explanation(contributors: Contributor[]): string {
  const negatives = contributors.filter((c) => c.direction === 'NEGATIVE')
  if (negatives.length === 0) {
    return 'All subsystems are contributing near their expected baseline - no single factor is driving the simulated health index down.'
  }
  const primary = subsystemLabel(negatives[0].subsystem)
  if (negatives.length === 1) {
    return `The simulated health index is being reduced primarily by the ${primary} subsystem.`
  }
  const secondary = subsystemLabel(negatives[1].subsystem)
  return `The simulated health index is deteriorating primarily because of the ${primary} subsystem, with ${secondary} as a secondary contributor.`
}

export default function Contributions({ contributors }: Props) {
  const max = Math.max(1, ...contributors.map((c) => Math.abs(c.contribution)))

  return (
    <div className="card">
      <div className="card-title">Contribution analysis</div>
      <p style={{ fontSize: 13, color: 'var(--text-1)', marginTop: 0, marginBottom: 14 }}>
        {explanation(contributors)}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {contributors.map((c) => {
          const width = (Math.abs(c.contribution) / max) * 100
          const color = c.direction === 'NEGATIVE' ? 'var(--state-warning)' : 'var(--state-healthy)'
          return (
            <div key={c.subsystem} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 56px', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12.5 }}>{subsystemLabel(c.subsystem)}</span>
              <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${width}%`, height: '100%', background: color }} />
              </div>
              <span className="mono" style={{ fontSize: 12, textAlign: 'right', color }}>
                {c.contribution > 0 ? '+' : ''}{c.contribution.toFixed(1)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
