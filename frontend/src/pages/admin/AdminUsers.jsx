import { useState } from 'react'
import { Search } from 'lucide-react'
import { Badge, Button, ErrorState, Input, PageHeader, PageLoader, Pagination, Select, Table } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errMsg } from '../../services/api'
import useFetch from '../../hooks/useFetch'
import { fmtDate, label } from '../../utils/format'

export default function AdminUsers() {
  const { user: me, isSuperAdmin } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1); const [q, setQ] = useState(''); const [role, setRole] = useState('')
  const { data, loading, error, reload } = useFetch('/admin/users/', { params: { page, q: q || undefined, role: role || undefined } })
  const update = async (u, patch) => { try { await api.put(`/admin/users/${u.id}/`, patch); toast.success('User updated.'); reload() } catch (e) { toast.error(errMsg(e)) } }
  return (
    <div>
      <PageHeader title="Users" text="Deactivate accounts or change roles. Only super admins can change roles." />
      <div className="mb-4 flex flex-wrap gap-3"><div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input aria-label="Search users" className="!pl-10" placeholder="Search name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div><Select aria-label="Role" className="!w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }}><option value="">All roles</option><option value="user">Users</option><option value="admin">Admins</option><option value="super_admin">Super admins</option></Select></div>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : (<>
        <Table rows={data.results} columns={[{ key: 'name', label: 'Name', render: (u) => <span><strong>{u.name}</strong><span className="block text-xs text-muted">{u.email}</span></span> }, { key: 'phone', label: 'Phone' }, { key: 'role', label: 'Role', render: (u) => isSuperAdmin && u.id !== me.id ? <Select aria-label={`Role for ${u.name}`} className="!w-auto !py-1.5" value={u.role} onChange={(e) => update(u, { role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></Select> : <Badge>{label(u.role)}</Badge> }, { key: 'v', label: 'Email', render: (u) => <Badge tone={u.is_verified ? 'ok' : 'warn'}>{u.is_verified ? 'Verified' : 'Unverified'}</Badge> }, { key: 'c', label: 'Joined', render: (u) => fmtDate(u.created_at) }, { key: 'a', label: 'Account', render: (u) => u.id === me.id ? <span className="text-xs text-muted">You</span> : <Button variant={u.is_active === false ? 'secondary' : 'ghost'} onClick={() => update(u, { is_active: u.is_active === false })}>{u.is_active === false ? 'Activate' : 'Deactivate'}</Button> }]} />
        <Pagination page={data.page} totalPages={data.total_pages} onChange={setPage} /></>)}
    </div>
  )
}
