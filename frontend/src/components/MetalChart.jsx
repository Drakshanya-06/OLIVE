import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { matColor, mgToText, cap } from '../utils/format'

/** Horizontal bars for recoverable material amounts (mg). */
export default function MetalChart({ data, height = 260, valueKey = 'mg' }) {
  if (!data?.length) return null
  const rows = data.map((d) => ({ ...d, name: cap(d.material) }))
  return (
    <div style={{ height }} role="img" aria-label="Chart of recoverable materials">
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="rgb(var(--line))" />
          <XAxis type="number" scale="sqrt" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} tickFormatter={mgToText} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: 'rgb(var(--ink))' }} />
          <Tooltip formatter={(v) => mgToText(v)} contentStyle={{ borderRadius: 12, border: '1px solid rgb(var(--line))', background: 'rgb(var(--surface))' }} />
          <Bar dataKey={valueKey} radius={[0, 6, 6, 0]}>{rows.map((r) => <Cell key={r.material} fill={matColor(r.material)} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-[11px] text-muted">Square-root scale so small amounts of gold and silver stay visible.</p>
    </div>
  )
}
