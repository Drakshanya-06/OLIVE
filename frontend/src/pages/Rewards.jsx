import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Coins, Clock, Gift, Trophy, TicketPercent, Medal, Recycle, Leaf, Award, BookOpen, GraduationCap, Newspaper, Flag } from 'lucide-react'

const Icons = { Recycle, Leaf, Award, Trophy, BookOpen, GraduationCap, Newspaper, Flag, Medal }
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, PageLoader, Pagination, ProgressBar, StatCard, Tabs, Table } from '../components/ui'
import { useToast } from '../context/ToastContext'
import api, { errMsg } from '../services/api'
import useFetch from '../hooks/useFetch'
import { fmtDateTime, fmtNum, label } from '../utils/format'

export default function Rewards() {
  const toast = useToast()
  const [tab, setTab] = useState('coupons')
  const [page, setPage] = useState(1)
  const bal = useFetch('/rewards/balance/')
  const coupons = useFetch('/rewards/coupons/')
  const hist = useFetch('/rewards/history/', { params: { page } })
  const mine = useFetch('/rewards/my-coupons/')
  const ach = useFetch('/rewards/achievements/')
  const board = useFetch('/rewards/leaderboard/')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  const redeem = async () => {
    setBusy(true)
    try { const { data } = await api.post('/rewards/redeem/', { coupon_id: confirm.id }); setDone(data); setConfirm(null); bal.reload(); coupons.reload(); hist.reload(); mine.reload() }
    catch (e) { toast.error(errMsg(e)); setConfirm(null) } finally { setBusy(false) }
  }
  if (bal.loading) return <PageLoader />
  if (bal.error) return <div className="mx-auto max-w-3xl p-8"><ErrorState message={bal.error} onRetry={bal.reload} /></div>
  const b = bal.data
  const lv = b.level

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Rewards and credits" text="Points are credited once, after a facility verifies your device. Every change is recorded in a ledger." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Coins} label="Available points" value={fmtNum(b.available)} />
        <StatCard icon={Trophy} label="Total earned" value={fmtNum(b.total_earned)} />
        <StatCard icon={Clock} label="Pending (estimated)" value={fmtNum(b.pending)} sub="Credited only after verification" />
        <StatCard icon={Gift} label="Redeemed" value={fmtNum(b.redeemed)} />
      </div>
      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">Level: {lv.name}</p><p className="text-sm text-muted">{lv.next_name ? `${lv.next_at - lv.recycled} more verified recycle(s) to ${lv.next_name}` : 'Top level reached'}</p></div>
        {lv.next_at && <ProgressBar className="mt-3" value={lv.recycled} max={lv.next_at} />}
      </Card>

      <div className="mt-8"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'coupons', label: 'Redeem' }, { value: 'history', label: 'Points history' }, { value: 'mine', label: 'My coupons' }, { value: 'achievements', label: 'Achievements' }, { value: 'leaderboard', label: 'Leaderboard' }]} /></div>
      <div className="mt-6">
        {tab === 'coupons' && (coupons.loading ? <PageLoader /> : !coupons.data?.results.length ? <EmptyState icon={TicketPercent} title="No coupons available" text="Check back soon. Administrators add new rewards regularly." /> : (
          <div className="grid gap-4 md:grid-cols-3">{coupons.data.results.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              {c.is_sample && <Badge tone="sample" className="mb-2 self-start">Sample reward</Badge>}
              <h3 className="font-sans text-lg font-semibold">{c.title}</h3><p className="mt-1 flex-1 text-sm text-muted">{c.description}</p>
              <p className="mt-4 font-display text-2xl font-semibold">{fmtNum(c.points_cost)} <span className="text-sm font-sans font-normal text-muted">points</span></p>
              <Button className="mt-3" disabled={b.available < c.points_cost} onClick={() => setConfirm(c)}>{b.available < c.points_cost ? `Need ${fmtNum(c.points_cost - b.available)} more` : 'Redeem'}</Button>
            </Card>))}</div>))}
        {tab === 'history' && (hist.loading ? <PageLoader /> : !hist.data?.results.length ? <EmptyState icon={Coins} title="No transactions yet" text="Verified recycling and redemptions will appear here." action={<Link to="/device-analyzer" className="btn btn-primary">Analyze a device</Link>} /> : (
          <><Table columns={[{ key: 't', label: 'Transaction', render: (r) => <span className="font-mono text-xs">{r.transaction_id}</span> }, { key: 'd', label: 'Description', render: (r) => r.description }, { key: 'ty', label: 'Type', render: (r) => <Badge tone={r.points > 0 ? 'ok' : 'neutral'}>{label(r.type)}</Badge> }, { key: 'p', label: 'Points', render: (r) => <strong className={r.points > 0 ? 'text-ok' : ''}>{r.points > 0 ? '+' : ''}{fmtNum(r.points)}</strong> }, { key: 'dt', label: 'Date', render: (r) => fmtDateTime(r.created_at) }, { key: 's', label: 'Status', render: (r) => label(r.status) }]} rows={hist.data.results} /><Pagination page={hist.data.page} totalPages={hist.data.total_pages} onChange={setPage} /></>))}
        {tab === 'mine' && (!mine.data?.results.length ? <EmptyState icon={TicketPercent} title="No coupons redeemed" text="Redeemed coupon codes will be listed here." /> : (
          <div className="grid gap-4 md:grid-cols-2">{mine.data.results.map((c) => <Card key={c.id} className="p-5"><p className="font-semibold">{c.coupon_title}</p><p className="mt-2 rounded-lg bg-soft px-3 py-2 font-mono text-lg tracking-wider">{c.coupon_code}</p><p className="mt-2 text-xs text-muted">Redeemed {fmtDateTime(c.created_at)} - {c.transaction_id}</p></Card>)}</div>))}
        {tab === 'achievements' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(ach.data?.results || []).map((a) => { const I = Icons[a.icon] || Medal; return (
            <Card key={a.id} className={`p-5 ${a.earned ? '' : 'opacity-60'}`}><span className={`mb-3 grid h-11 w-11 place-items-center rounded-full ${a.earned ? 'bg-brand-strong text-white' : 'bg-soft text-muted'}`}><I className="h-5 w-5" /></span><h3 className="font-sans font-semibold">{a.title}</h3><p className="mt-1 text-sm text-muted">{a.description}</p><p className="mt-2 text-xs">{a.earned ? 'Earned' : 'Locked'}</p></Card>) })}</div>)}
        {tab === 'leaderboard' && (!board.data?.results.length ? <EmptyState icon={Trophy} title="No verified recyclers yet" text="Be the first on the board. Only first names and initials are shown." /> : (
          <Table columns={[{ key: 'rank', label: 'Rank' }, { key: 'name', label: 'Recycler' }, { key: 'level', label: 'Level' }, { key: 'recycled', label: 'Devices' }, { key: 'kg', label: 'kg recycled' }]} rows={board.data.results} />))}
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Redeem this coupon?">
        {confirm && <><p className="text-sm">{confirm.title} costs <strong>{fmtNum(confirm.points_cost)} points</strong>. This cannot be undone.</p><div className="mt-5 flex gap-2"><Button loading={busy} onClick={redeem}>Confirm redeem</Button><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button></div></>}
      </Modal>
      <Modal open={!!done} onClose={() => setDone(null)} title="Coupon redeemed">
        {done && <div className="text-center"><p className="text-sm text-muted">Your coupon code</p><p className="my-3 rounded-xl bg-soft px-4 py-3 font-mono text-2xl tracking-widest">{done.coupon_code}</p><p className="text-sm text-muted">It is also saved under My coupons.</p></div>}
      </Modal>
    </div>
  )
}
