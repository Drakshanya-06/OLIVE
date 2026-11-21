import { useEffect, useState } from 'react'
import { Button, Card, ErrorState, Field, Input, PageHeader, PageLoader, Table, Textarea } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errDetails, errMsg } from '../../services/api'
import useFetch from '../../hooks/useFetch'
import { fmtDateTime } from '../../utils/format'

const kv = (o) => Object.entries(o || {}).map(([k, v]) => `${k}=${v}`).join('\n')
const parse = (t) => Object.fromEntries(t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [k, v] = l.split('='); return [k.trim(), Number(v)] }))
const NUMS = [['points_per_inr', 'Points per rupee of recoverable value'], ['max_points_per_request', 'Maximum points per request'], ['default_recovery_rate', 'Default recovery rate (0-1)'], ['co2e_kg_avoided_per_kg_recycled', 'CO2e avoided per kg recycled'], ['landfill_diverted_share', 'Share of weight kept from landfill (0-1)'], ['max_pickup_days_ahead', 'Booking window (days)'], ['leaderboard_size', 'Leaderboard size']]

export default function AdminSettings() {
  const { isSuperAdmin } = useAuth(); const toast = useToast()
  const { data, loading, error, reload } = useFetch('/admin/settings/')
  const logs = useFetch('/admin/logs/', { params: { page_size: 15 } })
  const [v, setV] = useState(null); const [prices, setPrices] = useState(''); const [cond, setCond] = useState(''); const [busy, setBusy] = useState(false); const [fe, setFe] = useState({})
  const [msg, setMsg] = useState({ title: '', message: '' }); const [sending, setSending] = useState(false)
  useEffect(() => { if (data) { setV(data.values); setPrices(kv(data.values.material_prices_inr_per_g)); setCond(kv(data.values.condition_multipliers)) } }, [data])
  if (loading || !v) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setFe({})
    try { const body = {}; NUMS.forEach(([k]) => (body[k] = Number(v[k]))); body.material_prices_inr_per_g = parse(prices); body.condition_multipliers = parse(cond); await api.put('/admin/settings/', body); toast.success('Settings saved. New estimates use them immediately.'); reload() }
    catch (ex) { setFe(errDetails(ex)); toast.error(errMsg(ex)) } finally { setBusy(false) }
  }
  const send = async (e) => { e.preventDefault(); setSending(true); try { const { data: r } = await api.post('/admin/notifications/broadcast/', msg); toast.success(`Sent to ${r.sent} user(s).`); setMsg({ title: '', message: '' }) } catch (ex) { toast.error(errMsg(ex)) } finally { setSending(false) } }

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" text="Every number used in estimates and rewards is configurable here. Material prices and environmental factors ship as placeholders: replace them with current, cited values." />
      <Card className="p-6">
        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          {NUMS.map(([k, l]) => <Field key={k} label={l} error={fe[k]}><Input type="number" step="any" disabled={!isSuperAdmin} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>)}
          <Field label="Material prices (INR per gram)" hint="One per line: name=price"><Textarea rows={7} disabled={!isSuperAdmin} value={prices} onChange={(e) => setPrices(e.target.value)} /></Field>
          <Field label="Condition multipliers" hint="working, damaged, not_working"><Textarea rows={7} disabled={!isSuperAdmin} value={cond} onChange={(e) => setCond(e.target.value)} /></Field>
          <div className="md:col-span-2">{isSuperAdmin ? <Button type="submit" loading={busy}>Save settings</Button> : <p className="text-sm text-muted">Only a super administrator can change settings.</p>}</div>
        </form>
        <p className="mt-4 rounded-xl bg-soft p-3 text-sm text-muted">Formula: estimated points = recoverable value in INR x points per rupee, capped at the maximum. Recoverable = content x recovery rate x condition multiplier.</p>
      </Card>
      <Card className="max-w-2xl p-6"><h2 className="mb-4 font-sans text-lg font-semibold">Send a notification to all users</h2>
        <form onSubmit={send} className="space-y-4"><Field label="Title"><Input required maxLength={100} value={msg.title} onChange={(e) => setMsg({ ...msg, title: e.target.value })} /></Field><Field label="Message"><Textarea required maxLength={400} value={msg.message} onChange={(e) => setMsg({ ...msg, message: e.target.value })} /></Field><Button type="submit" loading={sending}>Send notification</Button></form></Card>
      <div><h2 className="mb-3 font-sans text-lg font-semibold">Audit log</h2>
        <Table rows={logs.data?.results || []} columns={[{ key: 'a', label: 'Action', render: (l) => <span className="font-mono text-xs">{l.action}</span> }, { key: 'e', label: 'Admin', render: (l) => l.admin_email }, { key: 't', label: 'Target', render: (l) => l.target_type }, { key: 'd', label: 'When', render: (l) => fmtDateTime(l.created_at) }]} empty={<p className="text-sm text-muted">No admin activity yet.</p>} /></div>
    </div>
  )
}
