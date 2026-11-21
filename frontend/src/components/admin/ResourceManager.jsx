import { useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageLoader, Pagination, Select, Table, Textarea } from '../ui'
import { useToast } from '../../context/ToastContext'
import api, { errDetails, errMsg } from '../../services/api'
import useFetch from '../../hooks/useFetch'

const kvToText = (o) => Object.entries(o || {}).map(([k, v]) => `${k}=${v}`).join('\n')
const textToKv = (t) => Object.fromEntries(t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [k, ...r] = l.split('='); return [k.trim(), Number(r.join('=').trim())] }))
const isoDay = (v) => (v ? String(v).slice(0, 10) : '')

function QuestionsEditor({ value, onChange }) {
  const qs = value || []
  const upd = (i, patch) => onChange(qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)))
  return (
    <div className="space-y-4">
      {qs.map((q, i) => (
        <div key={i} className="rounded-xl border border-line p-3">
          <div className="flex gap-2"><Input placeholder={`Question ${i + 1}`} value={q.question} onChange={(e) => upd(i, { question: e.target.value })} /><Button type="button" variant="ghost" aria-label="Remove question" onClick={() => onChange(qs.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4" /></Button></div>
          <div className="mt-2 space-y-2">{q.options.map((o, oi) => (
            <div key={oi} className="flex items-center gap-2"><input type="radio" aria-label="Correct answer" className="accent-teal-600" checked={q.correct_index === oi} onChange={() => upd(i, { correct_index: oi })} /><Input placeholder={`Option ${oi + 1}`} value={o} onChange={(e) => upd(i, { options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)) })} /></div>))}</div>
          <div className="mt-2 flex gap-2">{q.options.length < 6 && <Button type="button" variant="secondary" onClick={() => upd(i, { options: [...q.options, ''] })}>Add option</Button>}{q.options.length > 2 && <Button type="button" variant="ghost" onClick={() => upd(i, { options: q.options.slice(0, -1), correct_index: Math.min(q.correct_index, q.options.length - 2) })}>Remove last option</Button>}</div>
          <Input className="mt-2" placeholder="Explanation (optional)" value={q.explanation || ''} onChange={(e) => upd(i, { explanation: e.target.value })} />
        </div>))}
      <Button type="button" variant="secondary" onClick={() => onChange([...qs, { question: '', options: ['', ''], correct_index: 0, explanation: '' }])}><Plus className="h-4 w-4" />Add question</Button>
    </div>
  )
}

function FieldInput({ f, value, onChange }) {
  const common = { id: f.key, value: value ?? '', onChange: (e) => onChange(e.target.value) }
  switch (f.type) {
    case 'textarea': return <Textarea {...common} rows={f.rows || 4} />
    case 'number': return <Input {...common} type="number" step="any" />
    case 'date': return <Input {...common} type="date" />
    case 'select': return <Select {...common}>{!f.required && <option value="">-</option>}{f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</Select>
    case 'checkbox': return <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={!!value} onChange={(e) => onChange(e.target.checked)} />{f.checkLabel || 'Yes'}</label>
    case 'multicheck': return <div className="flex flex-wrap gap-2">{f.options.map((o) => { const on = (value || []).includes(o); return <button type="button" key={o} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])} className={`rounded-full border px-3 py-1 text-xs font-medium ${on ? 'border-brand-strong bg-soft text-brand' : 'border-line text-muted'}`}>{o}</button> })}</div>
    case 'kv': return <Textarea {...common} rows={6} placeholder={f.placeholder} />
    case 'questions': return <QuestionsEditor value={value} onChange={onChange} />
    default: return <Input {...common} />
  }
}

/** Generic admin CRUD screen. Every action calls the real /api/admin/... endpoints. */
export default function ResourceManager({ endpoint, noun, columns, fields, defaults = {}, filters = [], searchable = true, wide = true }) {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [flt, setFlt] = useState({})
  const params = { page, q: q || undefined, ...flt }
  const { data, loading, error, reload } = useFetch(endpoint, { params })
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [fe, setFe] = useState({})
  const [busy, setBusy] = useState(false)

  const toForm = (row) => {
    const o = { ...defaults, ...(row || {}) }
    fields.forEach((f) => { if (f.type === 'kv') o[f.key] = kvToText(o[f.key]); if (f.type === 'date') o[f.key] = isoDay(o[f.key]) })
    return o
  }
  const open = (row) => { setEditing(row || {}); setForm(toForm(row)); setFe({}) }
  const toPayload = () => {
    const p = {}
    fields.forEach((f) => {
      let v = form[f.key]
      if (f.type === 'kv') v = textToKv(v || '')
      else if (f.type === 'number') v = v === '' || v === undefined || v === null ? undefined : Number(v)
      else if (f.type === 'date') v = v || undefined
      else if (f.type === 'select' && v === '') v = undefined
      if (v !== undefined) p[f.key] = v
    })
    return p
  }
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setFe({})
    try {
      if (editing.id) await api.put(`${endpoint}${editing.id}/`, toPayload()); else await api.post(endpoint, toPayload())
      toast.success(`${noun} saved.`); setEditing(null); reload()
    } catch (ex) { setFe(errDetails(ex)); toast.error(errMsg(ex)) } finally { setBusy(false) }
  }
  const remove = async (row) => { if (!window.confirm(`Delete this ${noun.toLowerCase()}? This cannot be undone.`)) return; try { await api.delete(`${endpoint}${row.id}/`); toast.success(`${noun} deleted.`); reload() } catch (ex) { toast.error(errMsg(ex)) } }

  const cols = [...columns, { key: '_a', label: '', render: (r) => <div className="flex justify-end gap-1"><Button variant="ghost" aria-label={`Edit ${noun}`} onClick={() => open(r)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" aria-label={`Delete ${noun}`} onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-danger" /></Button></div> }]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {searchable && <div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input aria-label="Search" className="!pl-10" placeholder="Search..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>}
        {filters.map((f) => <Select key={f.key} aria-label={f.label} className="!w-auto" value={flt[f.key] || ''} onChange={(e) => { setFlt({ ...flt, [f.key]: e.target.value || undefined }); setPage(1) }}><option value="">{f.label}</option>{f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</Select>)}
        <Button onClick={() => open(null)}><Plus className="h-4 w-4" />Add {noun.toLowerCase()}</Button>
      </div>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <><Table columns={cols} rows={data.results} empty={<EmptyState title={`No ${noun.toLowerCase()} records`} text="Create the first one with the Add button." />} /><Pagination page={data.page} totalPages={data.total_pages} onChange={setPage} /></>)}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`${editing?.id ? 'Edit' : 'Add'} ${noun.toLowerCase()}`} wide={wide}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => <div key={f.key} className={f.full || ['textarea', 'multicheck', 'kv', 'questions'].includes(f.type) ? 'sm:col-span-2' : ''}><Field label={f.label} htmlFor={f.key} error={fe[f.key]} hint={f.hint}><FieldInput f={f} value={form[f.key]} onChange={(v) => setForm({ ...form, [f.key]: v })} /></Field></div>)}
          <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={busy}>Save</Button><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button></div>
        </form>
      </Modal>
    </div>
  )
}
