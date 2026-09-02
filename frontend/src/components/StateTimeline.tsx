import type { StatePoint } from '../types/engine'
import { STATE_META } from '../statusMeta'

interface Props {
  stateSeries: StatePoint[]
  selectedIndex?: number
  onSelect?: (index: number) => void
}

export default function StateTimeline({ stateSeries, selectedIndex, onSelect }: Props) {
  return (
    <div className="card">
      <div className="card-title">Confirmed state timeline</div>
      <div
        style={{ display: 'flex', gap: 1, height: 28, borderRadius: 3, overflow: 'hidden', cursor: onSelect ? 'pointer' : 'default' }}
      >
        {stateSeries.map((s) => {
          const meta = STATE_META[s.state]
          const isSelected = selectedIndex === s.index
          return (
            <div
              key={s.index}
              onClick={() => onSelect?.(s.index)}
              title={`Row ${s.index}: ${meta.label}`}
              style={{
                flex: 1,
                background: meta.color,
                opacity: isSelected ? 1 : 0.8,
                outline: isSelected ? '2px solid var(--text-0)' : 'none',
                outlineOffset: -2,
              }}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {Object.entries(STATE_META).map(([key, meta]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)' }}>
            <span className="status-dot" style={{ background: meta.color }} />
            {meta.label}
          </div>
        ))}
      </div>
    </div>
  )
}
