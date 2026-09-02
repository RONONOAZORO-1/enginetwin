interface Props {
  color: string
  label: string
  outlined?: boolean
}

export default function StatusChip({ color, label, outlined = true }: Props) {
  return (
    <span
      className="status-chip"
      style={{
        color,
        borderColor: outlined ? color + '55' : 'transparent',
        background: color + '14',
      }}
    >
      <span className="status-dot" style={{ background: color }} />
      {label}
    </span>
  )
}
