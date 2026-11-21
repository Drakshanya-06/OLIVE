import { useState } from 'react'
import { Badge, Button, Card, ErrorState, Field, Input, PageHeader, PageLoader, Pagination, Select, Table, Tabs } from '../../components/ui'
import ResourceManager from '../../components/admin/ResourceManager'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errDetails, errMsg } from '../../services/api'
import useFetch from '../../hooks/useFetch'
import { fmtDate, fmtDateTime, fmtNum, label } from '../../utils/format'

function Ledger() {
  const [page, setPage] = useState(1); const [type, setType] = useState('')
  const { data, loading, error, reload } = useFetch('/admin/ledger/', { params: { page, type: type || undefined } })
  return (
    <div>
      <Select aria-label="Type" className="mb-4 !w-auto" value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}><option value="">All transaction types</option>{['earn', 'bonus', 'redeem', 'adjustment'].map((t) => <option key={t} value={t}>{label(t)}</option>)}</Select>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : (<><Table rows={data.results} columns={[{ key: 't', label: 'Transaction', render: (r) => <span className="font-mono text-xs">{r.transaction_id}</span> }, { key: 'u', label: 'User', render: (r) => r.user_email }, { key: 'ty', label: 'Type', render: (r) => <Badge>{label(r.type)}</Badge> }, { key: 'p', label: 'Points', render: (r) => <strong className={r.points > 0 ? 'text-ok' : ''}>{r.points > 0 ? '+' : ''}{fmtNum(r.points)}</strong> }, { key: 'd', label: 'Description', render: (r) => r.description }, { key: 'dt', label: 'Date', render: (r) => fmtDateTime(r.created_at) }]} /><Pagination page={data.page} totalPages={data.total_pages} onChange={setPage} /></>)}
    </div>
  )
}

function Adjust() {
  const toast = useToast(); const { isSuperAdmin } = useAuth()
  const [f, setF] = useState({ user_id: '', points: '', reason: '' }); const [fe, setFe] = useState({}); const [busy, setBusy] = useState(false)
  const { data: users } = useFetch('/admin/users/', { params: { role: 'user', page_size: 100 }, enabled: isSuperAdmin })
  if (!isSuperAdmin) return <Card className="p-6 text-sm text-muted">Only a super administrator can adjust balances. Every adjustment is written to the ledger and the audit log.</Card>
  const go = async (e) => { e.preventDefault(); setBusy(true); setFe({}); try { await api.post('/admin/points/adjust/', { ...f, points: Number(f.points) }); toast.success('Adjustment recorded in the ledger.'); setF({ user_id: '', points: '', reason: '' }) } catch (ex) { setFe(errDetails(ex)); toast.error(errMsg(ex)) } finally { setBusy(false) } }
  return (
    <Card className="max-w-xl p-6"><h2 className="mb-1 font-sans text-lg font-semibold">Manual points adjustment</h2><p className="mb-4 text-sm text-muted">For corrections only. Use a negative number to deduct.</p>
      <form onSubmit={go} className="space-y-4"><Field label="User" error={fe.user_id}><Select required value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })}><option value="">Select user</option>{(users?.results || []).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</Select></Field><Field label="Points" error={fe.points}><Input type="number" required value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} /></Field><Field label="Reason" error={fe.reason}><Input required minLength={5} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field><Button type="submit" loading={busy}>Record adjustment</Button></form></Card>
  )
}

export default function AdminRewards() {
  const [tab, setTab] = useState('ledger')
  return (
    <div>
      <PageHeader title="Rewards" text="Browse the reward ledger, manage coupons and correct balances."><Tabs value={tab} onChange={setTab} tabs={[{ value: 'ledger', label: 'Ledger' }, { value: 'coupons', label: 'Coupons' }, { value: 'adjust', label: 'Adjust points' }]} /></PageHeader>
      {tab === 'ledger' && <Ledger />}
      {tab === 'adjust' && <Adjust />}
      {tab === 'coupons' && <ResourceManager endpoint="/admin/coupons/" noun="Coupon" defaults={{ active: true, stock: 50, points_cost: 100, is_sample: false }}
        columns={[{ key: 'title', label: 'Title', render: (r) => <span><strong>{r.title}</strong><span className="block font-mono text-xs text-muted">{r.code}</span></span> }, { key: 'points_cost', label: 'Cost (points)' }, { key: 'stock', label: 'Stock' }, { key: 'redeemed_count', label: 'Redeemed' }, { key: 'expires_at', label: 'Expires', render: (r) => (r.expires_at ? fmtDate(r.expires_at) : 'Never') }, { key: 'active', label: 'Status', render: (r) => <Badge tone={r.active ? 'ok' : 'neutral'}>{r.active ? 'Active' : 'Off'}</Badge> }]}
        fields={[{ key: 'title', label: 'Title', required: true, full: true }, { key: 'description', label: 'Description', full: true }, { key: 'code', label: 'Internal code', required: true }, { key: 'points_cost', label: 'Points cost', type: 'number', required: true }, { key: 'stock', label: 'Stock', type: 'number', required: true }, { key: 'expires_at', label: 'Expires on', type: 'date' }, { key: 'active', label: 'Status', type: 'checkbox', checkLabel: 'Active' }, { key: 'is_sample', label: 'Sample', type: 'checkbox', checkLabel: 'Demonstration reward' }]} />}
    </div>
  )
}
