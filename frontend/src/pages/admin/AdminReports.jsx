import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
import { Button, Card, ErrorState, PageHeader, PageLoader, Table } from '../../components/ui'
import MetalChart from '../../components/MetalChart'
import { StatusBadge } from '../../components/RequestStatus'
import { useToast } from '../../context/ToastContext'
import api, { errMsg } from '../../services/api'
import useFetch from '../../hooks/useFetch'
import { fmtNum, label, monthLabel } from '../../utils/format'

const tip = { contentStyle: { borderRadius: 12, border: '1px solid rgb(var(--line))', background: 'rgb(var(--surface))' } }

export default function AdminReports() {
  const toast = useToast()
  const { data: r, loading, error, reload } = useFetch('/admin/reports/')
  const { data: a } = useFetch('/admin/analytics/')
  const [busy, setBusy] = useState(false)
  const exportCsv = async () => {
    setBusy(true)
    try {
      const res = await api.get('/admin/reports/', { params: { export: 'csv' }, responseType: 'blob' })
      const url = URL.createObjectURL(res.data); const el = document.createElement('a'); el.href = url; el.download = 'olive-recycling-requests.csv'; el.click(); URL.revokeObjectURL(url)
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={reload} />
  const monthly = r.monthly.map((m) => ({ ...m, name: monthLabel(m.month) }))
  const growth = (a?.user_growth || []).map((m) => ({ ...m, name: monthLabel(m.month) }))
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" text="Operational and environmental summaries."><Button variant="secondary" loading={busy} onClick={exportCsv}><Download className="h-4 w-4" />Export requests (CSV)</Button></PageHeader>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Requests per month</h2><div className="mt-4 h-60"><ResponsiveContainer><BarChart data={monthly}><CartesianGrid vertical={false} stroke="rgb(var(--line))" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }} /><Tooltip {...tip} /><Legend /><Bar dataKey="submitted" name="Submitted" fill="#A3B18A" radius={[4, 4, 0, 0]} /><Bar dataKey="verified" name="Verified" fill="#556B2F" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-6"><h2 className="font-sans text-lg font-semibold">New users per month</h2><div className="mt-4 h-60"><ResponsiveContainer><LineChart data={growth}><CartesianGrid vertical={false} stroke="rgb(var(--line))" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }} /><Tooltip {...tip} /><Line dataKey="users" name="Users" stroke="#556B2F" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></Card>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6"><p className="text-sm text-muted">Points issued</p><p className="font-display text-3xl font-semibold">{fmtNum(r.points.issued)}</p></Card>
        <Card className="p-6"><p className="text-sm text-muted">Points redeemed</p><p className="font-display text-3xl font-semibold">{fmtNum(r.points.redeemed)}</p></Card>
        <Card className="p-6"><p className="text-sm text-muted">Drop-off / pickup</p><p className="font-display text-3xl font-semibold">{r.methods.drop_off} / {r.methods.pickup}</p></Card>
      </div>
      <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Status breakdown</h2><div className="mt-4 flex flex-wrap gap-4">{Object.entries(r.status_counts).map(([s, n]) => <div key={s} className="min-w-[7rem] rounded-xl bg-soft p-3 text-center"><StatusBadge status={s} /><p className="mt-1 font-display text-2xl font-semibold">{n}</p></div>)}</div></Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Estimated vs verified material recovery</h2><p className="mb-3 text-sm text-muted">Estimated recoverable (verified requests)</p>{r.materials.estimated_recoverable.length ? <MetalChart data={r.materials.estimated_recoverable} height={220} /> : <p className="text-sm text-muted">No data yet.</p>}<p className="mb-3 mt-5 text-sm text-muted">Verified recovery (entered by admins)</p>{r.materials.verified_recovered.length ? <MetalChart data={r.materials.verified_recovered} height={220} /> : <p className="text-sm text-muted">No verified weights recorded yet.</p>}</Card>
        <div><h2 className="mb-3 font-sans text-lg font-semibold">Requests by facility</h2><Table rows={r.by_facility.map((x, i) => ({ ...x, id: i }))} columns={[{ key: 'facility', label: 'Facility' }, { key: 'requests', label: 'Requests' }, { key: 'verified', label: 'Verified' }]} empty={<p className="text-sm text-muted">No requests yet.</p>} />
          <h2 className="mb-3 mt-6 font-sans text-lg font-semibold">Devices analyzed by category</h2><Table rows={(a?.device_categories || []).map((x, i) => ({ ...x, id: i }))} columns={[{ key: 'category', label: 'Category', render: (x) => label(x.category) }, { key: 'count', label: 'Analyses' }]} empty={<p className="text-sm text-muted">No analyses yet.</p>} /></div>
      </div>
    </div>
  )
}
