import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Users, FileText, CheckCircle2, Clock, Recycle, Coins, MapPin } from 'lucide-react'
import { Card, ErrorState, PageHeader, PageLoader, StatCard } from '../../components/ui'
import { StatusBadge } from '../../components/RequestStatus'
import MetalChart from '../../components/MetalChart'
import useFetch from '../../hooks/useFetch'
import { fmtDateTime, fmtNum, label, monthLabel } from '../../utils/format'

export default function AdminDashboard() {
  const { data: d, loading, error, reload } = useFetch('/admin/dashboard/')
  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={reload} />
  const t = d.totals
  const monthly = d.monthly.map((m) => ({ ...m, name: monthLabel(m.month) }))
  return (
    <div className="space-y-6">
      <PageHeader title="Admin dashboard" text="A live view of users, requests, rewards and facilities." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Registered users" value={fmtNum(t.users)} />
        <StatCard icon={FileText} label="Recycling requests" value={fmtNum(t.requests)} />
        <StatCard icon={CheckCircle2} label="Completed (verified)" value={fmtNum(t.completed)} />
        <StatCard icon={Clock} label="Pending requests" value={fmtNum(t.pending)} />
        <StatCard icon={Recycle} label="Devices recycled" value={fmtNum(t.devices_recycled)} />
        <StatCard icon={Coins} label="Points issued" value={fmtNum(t.points_issued)} />
        <StatCard icon={MapPin} label="Facilities" value={d.facility_stats.total} sub={`${d.facility_stats.verified} verified, ${d.facility_stats.sample} sample`} />
        <StatCard icon={FileText} label="Devices analyzed" value={fmtNum(t.devices_analyzed)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Monthly recycling</h2><div className="mt-4 h-64"><ResponsiveContainer><BarChart data={monthly}><CartesianGrid vertical={false} stroke="rgb(var(--line))" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgb(var(--line))', background: 'rgb(var(--surface))' }} /><Legend /><Bar dataKey="submitted" name="Submitted" fill="#A3B18A" radius={[4, 4, 0, 0]} /><Bar dataKey="verified" name="Verified" fill="#556B2F" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Requests by status</h2><ul className="mt-4 space-y-2 text-sm">{Object.entries(d.status_counts).map(([s, n]) => <li key={s} className="flex items-center justify-between"><StatusBadge status={s} /><strong>{n}</strong></li>)}</ul></Card>
      </div>
      <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Estimated material recovery (verified requests)</h2><p className="mb-3 text-sm text-muted">Estimates only. Verified weights appear when you record them while verifying a request.</p>{d.materials.estimated_recoverable.length ? <MetalChart data={d.materials.estimated_recoverable} height={240} /> : <p className="text-sm text-muted">No verified requests yet.</p>}</Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Recent requests</h2><ul className="mt-3 divide-y divide-line text-sm">{d.recent_requests.map((r) => <li key={r.id} className="flex items-center justify-between gap-2 py-2.5"><span><span className="block font-mono text-xs">{r.request_code}</span><span className="text-muted">{r.user?.name} - {label(r.device?.category || '')}</span></span><StatusBadge status={r.status} /></li>)}{!d.recent_requests.length && <li className="py-3 text-muted">No requests yet.</li>}</ul></Card>
        <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Recent admin activity</h2><ul className="mt-3 divide-y divide-line text-sm">{d.recent_activity.map((a) => <li key={a.id} className="py-2.5"><span className="font-medium">{a.action}</span><span className="block text-xs text-muted">{a.admin_email} - {fmtDateTime(a.created_at)}</span></li>)}{!d.recent_activity.length && <li className="py-3 text-muted">No activity yet.</li>}</ul></Card>
      </div>
    </div>
  )
}
