import { Leaf, Coins, Info, Trash2, Layers } from 'lucide-react'
import { Badge, Card } from './ui'
import MetalChart from './MetalChart'
import { cap, fmtNum, label, matColor, mgToText } from '../utils/format'

export default function AnalysisResult({ a }) {
  const chart = a.materials.map((m) => ({ material: m.material, mg: m.estimated_recoverable_mg }))
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{a.brand || 'Generic'} {a.model || cap(a.category)}</h2>
            <p className="mt-1 text-sm text-muted">{label(a.category)} - {label(a.condition)} - about {fmtNum(a.weight_g)} g{a.purchase_year ? ` - bought ${a.purchase_year}` : ''}</p>
          </div>
          <div className="flex flex-wrap gap-2"><Badge tone={a.estimate_type === 'model_specific' ? 'ok' : 'warn'}>{a.estimate_label}</Badge><Badge tone="neutral">Confidence: {a.confidence}</Badge></div>
        </div>
        {a.estimate_type === 'category_estimate' && <p className="mt-3 rounded-xl bg-warn/10 p-3 text-sm">We have no reference for this exact model, so this is a category average scaled by weight. Treat it as a rough guide.</p>}
        {a.is_placeholder_data && <p className="mt-3 rounded-xl bg-soft p-3 text-sm text-muted">Reference figures are placeholder data for the academic demo. Source: {a.data_source}</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-sans text-lg font-semibold"><Layers className="h-5 w-5 text-brand" />Estimated recoverable materials</h3>
          <div className="mt-4"><MetalChart data={chart} /></div>
        </Card>
        <Card className="p-6">
          <h3 className="font-sans text-lg font-semibold">Material breakdown</h3>
          <ul className="mt-3 divide-y divide-line text-sm">
            {a.materials.map((m) => (
              <li key={m.material} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: matColor(m.material) }} />{cap(m.material)}</span>
                <span className="text-right"><span className="block font-medium">{mgToText(m.estimated_recoverable_mg)}</span><span className="block text-xs text-muted">of ~{mgToText(m.estimated_content_mg)} inside</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="p-5"><Coins className="mb-2 h-5 w-5 text-brand" /><p className="text-sm text-muted">Preliminary points</p><p className="font-display text-3xl font-semibold">{fmtNum(a.preliminary_points)}</p><p className="mt-1 text-xs text-muted">Not credited until your request is verified. Estimated value Rs {fmtNum(a.estimated_value_inr, 2)}.</p></Card>
        <Card className="p-5"><Leaf className="mb-2 h-5 w-5 text-brand" /><p className="text-sm text-muted">Estimated environmental benefit</p><p className="font-display text-3xl font-semibold">{fmtNum(a.environment.co2e_avoided_kg, 2)} kg</p><p className="mt-1 text-xs text-muted">CO2e avoided, and {fmtNum(a.environment.landfill_diverted_kg, 2)} kg kept out of landfill (configurable factors).</p></Card>
        <Card className="p-5"><Info className="mb-2 h-5 w-5 text-brand" /><p className="text-sm text-muted">How we calculate</p><p className="mt-1 text-xs text-muted">Recoverable = content x {a.recovery_rate * 100}% recovery x {a.condition_multiplier} condition. {a.formula}.</p></Card>
      </div>

      <Card className="p-5">
        <h3 className="font-sans text-base font-semibold">Three different numbers, never mixed</h3>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-xl bg-soft p-3"><dt className="font-semibold">Estimated content</dt><dd className="text-muted">{a.levels.estimated_content}</dd></div>
          <div className="rounded-xl bg-soft p-3"><dt className="font-semibold">Estimated recoverable</dt><dd className="text-muted">{a.levels.estimated_recoverable}</dd></div>
          <div className="rounded-xl bg-soft p-3"><dt className="font-semibold">Verified recovery</dt><dd className="text-muted">Not available yet. Set by an administrator after your device is verified.</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">{a.disclaimer}</p>
      </Card>
    </div>
  )
}

export function Advice({ items }) {
  if (!items?.length) return null
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-sans text-base font-semibold"><Trash2 className="h-5 w-5 text-brand" />Smart disposal tips</h3>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </Card>
  )
}
