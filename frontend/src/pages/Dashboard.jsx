import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Smartphone, Recycle, Coins, Clock, FileText, Leaf, Bell, LogOut, Award } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, PageLoader, ProgressBar, Select, StatCard, Tabs } from '../components/ui'
import MetalChart from '../components/MetalChart'
import { StatusBadge } from '../components/RequestStatus'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import api, { errDetails, errMsg } from '../services/api'
import useFetch from '../hooks/useFetch'
import { cap, fmtDateTime, fmtNum, monthLabel } from '../utils/format'

function Settings({ user, setUser }) {
  const toast = useToast()
  const { theme, setTheme } = useTheme()
  const nav = useNavigate()
  const { logout } = useAuth()
  const [p, setP] = useState({ name: user.name, phone: user.phone, city: user.city || '', pincode: user.pincode || '', address: user.address || '', show_on_leaderboard: user.show_on_leaderboard !== false })
  const [pw, setPw] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [pe, setPe] = useState({}); const [we, setWe] = useState({}); const [b1, setB1] = useState(false); const [b2, setB2] = useState(false)

  const saveProfile = async (e) => { e.preventDefault(); setPe({}); setB1(true); try { const { data } = await api.put('/users/profile/', p); setUser(data.user); toast.success('Profile saved.') } catch (ex) { setPe(errDetails(ex)); toast.error(errMsg(ex)) } finally { setB1(false) } }
  const savePw = async (e) => { e.preventDefault(); setWe({}); setB2(true); try { await api.put('/users/change-password/', pw); setPw({ old_password: '', new_password: '', confirm_password: '' }); toast.success('Password changed.') } catch (ex) { setWe(errDetails(ex)); toast.error(errMsg(ex)) } finally { setB2(false) } }
  const saveTheme = async (t) => { setTheme(t); try { await api.put('/users/profile/', { theme: t }) } catch { /* theme still applied locally */ } }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6"><h2 className="mb-4 font-sans text-lg font-semibold">Edit profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Full name" error={pe.name}><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Email" hint="Email cannot be changed."><Input value={user.email} disabled /></Field>
          <Field label="Phone" error={pe.phone}><Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="City"><Input value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} /></Field><Field label="PIN code" error={pe.pincode}><Input value={p.pincode} onChange={(e) => setP({ ...p, pincode: e.target.value })} /></Field></div>
          <Field label="Address"><Input value={p.address} onChange={(e) => setP({ ...p, address: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={p.show_on_leaderboard} onChange={(e) => setP({ ...p, show_on_leaderboard: e.target.checked })} />Show my first name and initial on the community leaderboard</label>
          <Button type="submit" loading={b1}>Save profile</Button>
        </form></Card>
      <div className="space-y-6">
        <Card className="p-6"><h2 className="mb-4 font-sans text-lg font-semibold">Change password</h2>
          <form onSubmit={savePw} className="space-y-4">
            <Field label="Current password" error={we.old_password}><Input type="password" autoComplete="current-password" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} /></Field>
            <Field label="New password" error={we.new_password}><Input type="password" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
            <Field label="Confirm new password" error={we.confirm_password}><Input type="password" autoComplete="new-password" value={pw.confirm_password} onChange={(e) => setPw({ ...pw, confirm_password: e.target.value })} /></Field>
            <Button type="submit" loading={b2}>Update password</Button>
          </form><p className="mt-3 text-sm text-muted">Forgot it? <Link to="/forgot-password" className="text-brand hover:underline">Reset by email</Link></p></Card>
        <Card className="p-6"><h2 className="mb-4 font-sans text-lg font-semibold">Theme and account</h2>
          <Field label="Theme"><Select value={theme} onChange={(e) => saveTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option></Select></Field>
          <Button variant="secondary" className="mt-4" onClick={async () => { await logout(); nav('/') }}><LogOut className="h-4 w-4" />Sign out</Button></Card>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, setUser } = useAuth()
  const [tab, setTab] = useState('overview')
  const sum = useFetch('/dashboard/summary/')
  const act = useFetch('/dashboard/activity/')
  const markAll = async () => { await api.post('/notifications/', {}); sum.reload() }

  if (sum.loading) return <PageLoader />
  if (sum.error) return <div className="mx-auto max-w-3xl p-8"><ErrorState message={sum.error} onRetry={sum.reload} /></div>
  const d = sum.data
  const monthly = (act.data?.monthly || []).map((m) => ({ ...m, name: monthLabel(m.month) }))
  const est = d.materials.estimated_recoverable.map((m) => ({ material: m.material, mg: m.mg }))
  const ver = d.materials.verified_recovered.map((m) => ({ material: m.material, mg: m.mg }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} text={`${d.level.name} - ${d.level.recycled} verified recycle${d.level.recycled === 1 ? '' : 's'}`}><Tabs value={tab} onChange={setTab} tabs={[{ value: 'overview', label: 'Overview' }, { value: 'settings', label: 'Profile and settings' }]} /></PageHeader>
      {tab === 'settings' ? <Settings user={user} setUser={setUser} /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard icon={Smartphone} label="Devices registered" value={d.counts.devices_registered} />
            <StatCard icon={Recycle} label="Devices recycled" value={d.counts.devices_recycled} />
            <StatCard icon={Coins} label="Reward points" value={fmtNum(d.points.available)} sub={`${fmtNum(d.points.total_earned)} earned in total`} />
            <StatCard icon={Clock} label="Pending rewards" value={fmtNum(d.points.pending)} sub="Estimated, until verified" />
            <StatCard icon={FileText} label="Requests" value={d.counts.requests} sub={`${d.counts.active_requests} active`} />
          </div>
          {d.level.next_at && <Card className="p-5"><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold">{d.level.name}</span><span className="text-muted">{d.level.next_at - d.level.recycled} more to {d.level.next_name}</span></div><ProgressBar className="mt-3" value={d.level.recycled} max={d.level.next_at} /></Card>}

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Monthly recycling activity</h2>
              <div className="mt-4 h-64"><ResponsiveContainer><BarChart data={monthly}><CartesianGrid vertical={false} stroke="rgb(var(--line))" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgb(var(--line))', background: 'rgb(var(--surface))' }} /><Legend /><Bar dataKey="submitted" name="Submitted" fill="#A3B18A" radius={[4, 4, 0, 0]} /><Bar dataKey="verified" name="Verified" fill="#556B2F" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
            <Card className="p-6"><h2 className="flex items-center gap-2 font-sans text-lg font-semibold"><Leaf className="h-5 w-5 text-brand" />Environmental contribution</h2>
              <dl className="mt-4 space-y-3 text-sm">{[['Weight recycled', `${fmtNum(d.environment.weight_recycled_kg, 2)} kg`], ['Kept out of landfill', `${fmtNum(d.environment.landfill_diverted_kg, 2)} kg`], ['CO2e avoided (estimate)', `${fmtNum(d.environment.co2e_avoided_kg, 2)} kg`]].map(([k, v]) => <div key={k} className="flex justify-between rounded-xl bg-soft px-3 py-2.5"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>
              <p className="mt-3 text-xs text-muted">{d.environment.note}</p></Card>
          </div>

          <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Precious metal recovery</h2>
            {!est.length ? <p className="mt-3 text-sm text-muted">Once a request is verified, its estimated recoverable materials appear here.</p> : (
              <div className="mt-4 grid gap-6 md:grid-cols-2"><div><p className="mb-2 text-sm font-medium">Estimated recoverable</p><MetalChart data={est} height={220} /></div><div><p className="mb-2 text-sm font-medium">Verified recovery</p>{ver.length ? <MetalChart data={ver} height={220} /> : <p className="rounded-xl bg-soft p-4 text-sm text-muted">No verified material weights have been recorded by an administrator yet. Estimates are not verified amounts.</p>}</div></div>)}</Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-1"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-sans text-lg font-semibold"><Bell className="h-5 w-5 text-brand" />Notifications {d.unread_notifications > 0 && <Badge tone="info">{d.unread_notifications} new</Badge>}</h2>{d.unread_notifications > 0 && <button onClick={markAll} className="text-xs text-brand hover:underline">Mark all read</button>}</div>
              {!d.notifications.length ? <p className="mt-3 text-sm text-muted">You are all caught up.</p> : <ul className="mt-3 space-y-3">{d.notifications.map((n) => <li key={n.id} className={`rounded-xl p-3 text-sm ${n.is_read ? 'bg-soft/60' : 'bg-soft'}`}><p className="font-medium">{n.title}</p><p className="text-muted">{n.message}</p><p className="mt-1 text-xs text-muted">{fmtDateTime(n.created_at)}</p></li>)}</ul>}</Card>
            <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Recent requests</h2>
              {!d.recent_requests.length ? <EmptyState icon={Recycle} title="No requests yet" action={<Link to="/device-analyzer" className="btn btn-primary">Analyze a device</Link>} /> : <ul className="mt-3 space-y-3">{d.recent_requests.map((r) => <li key={r.id} className="flex items-center justify-between gap-2 text-sm"><span><span className="block font-mono text-xs">{r.request_code}</span>{cap(r.device?.category || '')}</span><StatusBadge status={r.status} /></li>)}</ul>}
              <Link to="/recycling" className="mt-4 inline-block text-sm text-brand hover:underline">All requests</Link></Card>
            <Card className="p-6"><h2 className="font-sans text-lg font-semibold">Recent transactions</h2>
              {!d.recent_transactions.length ? <p className="mt-3 text-sm text-muted">No points activity yet.</p> : <ul className="mt-3 space-y-3">{d.recent_transactions.map((t) => <li key={t.id} className="flex justify-between gap-2 text-sm"><span><span className="block">{t.description}</span><span className="text-xs text-muted">{fmtDateTime(t.created_at)}</span></span><strong className={t.points > 0 ? 'text-ok' : ''}>{t.points > 0 ? '+' : ''}{t.points}</strong></li>)}</ul>}
              <Link to="/rewards" className="mt-4 inline-block text-sm text-brand hover:underline">Rewards</Link></Card>
          </div>

          <Card className="p-6"><h2 className="flex items-center gap-2 font-sans text-lg font-semibold"><Award className="h-5 w-5 text-brand" />Achievement badges</h2>
            {!d.badges.length ? <p className="mt-3 text-sm text-muted">No badges yet. Pass a quiz or get a device verified to earn your first.</p> : <div className="mt-3 flex flex-wrap gap-2">{d.badges.map((b) => <Badge key={b.id} tone="ok">{cap(b.achievement_key.replaceAll('_', ' '))}</Badge>)}</div>}</Card>
        </div>)}
    </div>
  )
}
