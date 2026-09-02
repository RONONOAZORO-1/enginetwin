import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { HealthPoint } from '../types/engine'

interface Props {
  healthSeries: HealthPoint[]
}

export default function HealthTrend({ healthSeries }: Props) {
  const data = healthSeries.map((h) => ({ index: h.index, score: h.overall_score }))

  return (
    <div className="card">
      <div className="card-title">Simulated health index over time</div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis dataKey="index" stroke="var(--text-2)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
          <YAxis domain={[0, 100]} stroke="var(--text-2)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} width={32} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12 }}
            labelFormatter={(v) => `Row ${v}`}
            formatter={(v: number) => [v.toFixed(1), 'Health']}
          />
          <Area type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} fill="url(#healthFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
