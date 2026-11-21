import { useEffect, useRef, useState } from 'react'
import { ScanLine, Search, Eye } from 'lucide-react'
import { Badge, Button, Card, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Pagination, Select, Table, Textarea } from '../../components/ui'
import { StatusBadge, StatusTimeline } from '../../components/RequestStatus'
import { useToast } from '../../context/ToastContext'
import api, { errDetails, errMsg, mediaUrl } from '../../services/api'
import useFetch from '../../hooks/useFetch'
import { cap, fmtDate, fmtNum, label, mgToText } from '../../utils/format'

const NEXT = { submitted: ['under_review', 'approved', 'rejected'], under_review: ['approved', 'rejected'], approved: ['collected', 'rejected'], collected: ['rejected'], verified: ['completed'] }

function Scanner({ onResult, onClose }) {
  const videoRef = useRef(null); const [manual, setManual] = useState(''); const [msg, setMsg] = useState('')
  useEffect(() => {
    let stream, timer, stopped = false
    async function start() {
      if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) { setMsg('Camera scanning is not supported in this browser. Paste the QR text or use a USB scanner.'); return }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        videoRef.current.srcObject = stream; await videoRef.current.play()
        const det = new window.BarcodeDetector({ formats: ['qr_code'] })
        timer = setInterval(async () => { try { const codes = await det.detect(videoRef.current); if (codes[0] && !stopped) { stopped = true; onResult(codes[0].rawValue) } } catch { /* ignore frame errors */ } }, 500)
      } catch { setMsg('Camera permission denied. Paste the QR text instead.') }
    }
    start()
    return () => { clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()) }
  }, [onResult])
  return (
    <Modal open onClose={onClose} title="Scan recycling QR code">
      <video ref={videoRef} className="aspect-video w-full rounded-xl bg-ink/80" muted playsInline />
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); manual && onResult(manual.trim()) }}><Input aria-label="QR text" placeholder="OLIVE:OLV-2026-XXXXXX:..." value={manual} onChange={(e) => setManual(e.target.value)} /><Button type="submit">Look up</Button></form>
    </Modal>
  )
}

function Detail({ id, onClose, onChanged, preload }) {
  const toast = useToast()
  const { data: r, loading, reload } = useFetch(`/admin/recycling/${id}/`)
  const req = r || preload
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false)
  const [v, setV] = useState({ final_points: '', verified_weight_g: '', mats: '', note: '' }); const [fe, setFe] = useState({})
  useEffect(() => { if (req) setV((x) => ({ ...x, final_points: x.final_points === '' ? req.estimated_points : x.final_points })) }, [req])

  const setStatus = async (status) => {
    if (status === 'rejected' && !note.trim()) return toast.error('Add a reason for rejecting this request.')
    setBusy(true); try { await api.put(`/admin/recycling/${id}/status/`, { status, note }); toast.success(`Moved to ${label(status)}.`); setNote(''); reload(); onChanged() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  const verify = async () => {
    setBusy(true); setFe({})
    try {
      const body = { note: v.note || undefined }
      if (v.final_points !== '') body.final_points = Number(v.final_points)
      if (v.verified_weight_g !== '') body.verified_weight_g = Number(v.verified_weight_g)
      if (v.mats.trim()) body.verified_materials_mg = Object.fromEntries(v.mats.split('\n').filter(Boolean).map((l) => { const [k, n] = l.split('='); return [k.trim(), Number(n)] }))
      await api.post(`/admin/recycling/${id}/verify/`, body); toast.success('Verified. Points credited once.'); reload(); onChanged()
    } catch (e) { setFe(errDetails(e)); toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={req?.request_code || 'Request'} wide>
      {!req ? <PageLoader /> : (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={req.status} />{req.reward_credited && <Badge tone="ok">+{req.final_points} points credited</Badge>}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4"><p className="text-xs text-muted">User</p><p className="font-semibold">{req.user?.name}</p><p>{req.user?.email} - {req.user?.phone}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted">Device</p><p className="font-semibold">{cap(req.device?.category || '')} {req.device?.brand} {req.device?.model}</p><p>{label(req.device?.condition || '')} - ~{fmtNum(req.weight_g)} g</p></Card>
            <Card className="p-4"><p className="text-xs text-muted">Facility</p><p className="font-semibold">{req.facility?.name}</p><p>{req.facility?.city}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted">Collection</p><p className="font-semibold">{label(req.method)} on {fmtDate(req.preferred_date)}</p>{req.pickup_address && <p>{req.pickup_address}</p>}{req.notes && <p className="text-muted">{req.notes}</p>}</Card>
          </div>
          {!!req.photos?.length && <div className="flex flex-wrap gap-2">{req.photos.map((p) => <a key={p} href={mediaUrl(p)} target="_blank" rel="noreferrer"><img src={mediaUrl(p)} alt="Submitted device" className="h-20 w-20 rounded-lg object-cover" /></a>)}</div>}
          <div><p className="mb-1 font-semibold">Estimated recoverable materials (not verified)</p><p className="text-muted">{(req.estimated_materials || []).map((m) => `${cap(m.material)} ${mgToText(m.estimated_recoverable_mg)}`).join(', ') || '-'}</p></div>
          <StatusTimeline request={req} />
          {req.verified_materials_mg && <p><strong>Verified recovery:</strong> {Object.entries(req.verified_materials_mg).map(([k, n]) => `${cap(k)} ${mgToText(n)}`).join(', ')}</p>}

          {NEXT[req.status] && (
            <Card className="space-y-3 p-4"><p className="font-semibold">Update status</p>
              <Field label="Note (required when rejecting)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <div className="flex flex-wrap gap-2">{NEXT[req.status].map((s) => <Button key={s} loading={busy} variant={s === 'rejected' ? 'danger' : 'secondary'} onClick={() => setStatus(s)}>{label(s)}</Button>)}</div></Card>)}
          {['approved', 'collected'].includes(req.status) && !req.reward_credited && (
            <Card className="space-y-3 border-brand-strong p-4"><p className="font-semibold">Verify device and credit points</p><p className="text-muted">Points are credited exactly once. Adjust the final points if the verified material differs from the estimate.</p>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Final points" error={fe.final_points}><Input type="number" min="0" value={v.final_points} onChange={(e) => setV({ ...v, final_points: e.target.value })} /></Field><Field label="Verified weight (g, optional)"><Input type="number" min="0" value={v.verified_weight_g} onChange={(e) => setV({ ...v, verified_weight_g: e.target.value })} /></Field></div>
              <Field label="Verified material recovered in mg (optional)" hint="One per line, e.g. gold=18"><Textarea rows={3} value={v.mats} onChange={(e) => setV({ ...v, mats: e.target.value })} /></Field>
              <Button loading={busy} onClick={verify}>Verify and credit points</Button></Card>)}
        </div>)}
    </Modal>
  )
}

export default function AdminRequests() {
  const toast = useToast()
  const [page, setPage] = useState(1); const [status, setStatus] = useState(''); const [q, setQ] = useState('')
  const { data, loading, error, reload } = useFetch('/admin/recycling/', { params: { page, status: status || undefined, q: q || undefined } })
  const [open, setOpen] = useState(null); const [scan, setScan] = useState(false)

  const onScan = async (payload) => {
    setScan(false)
    try { const { data: r } = await api.post('/admin/recycling/scan/', { payload }); setOpen({ id: r.id, preload: r }); if (!r.can_verify) toast.error('This request cannot be verified right now.') }
    catch (e) { toast.error(errMsg(e)) }
  }
  return (
    <div>
      <PageHeader title="Recycling requests" text="Review, approve, collect and verify requests. Scanning a QR code opens the request for verification."><Button onClick={() => setScan(true)}><ScanLine className="h-4 w-4" />Scan QR code</Button></PageHeader>
      <div className="mb-4 flex flex-wrap gap-3"><div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input aria-label="Search by request ID" className="!pl-10" placeholder="Request ID, e.g. OLV-2026" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>
        <Select aria-label="Status" className="!w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option>{['submitted', 'under_review', 'approved', 'collected', 'verified', 'completed', 'rejected', 'cancelled'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></div>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : (<>
        <Table rows={data.results} columns={[{ key: 'c', label: 'Request', render: (r) => <span className="font-mono text-xs font-semibold">{r.request_code}</span> }, { key: 'u', label: 'User', render: (r) => r.user?.name }, { key: 'd', label: 'Device', render: (r) => cap(r.device?.category || '') }, { key: 'f', label: 'Facility', render: (r) => r.facility?.name }, { key: 's', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }, { key: 'p', label: 'Points', render: (r) => (r.reward_credited ? <strong className="text-ok">+{r.final_points}</strong> : `~${r.estimated_points}`) }, { key: 'dt', label: 'Date', render: (r) => fmtDate(r.created_at) }, { key: 'a', label: '', render: (r) => <Button variant="ghost" aria-label="Open request" onClick={() => setOpen({ id: r.id })}><Eye className="h-4 w-4" /></Button> }]} />
        <Pagination page={data.page} totalPages={data.total_pages} onChange={setPage} /></>)}
      {scan && <Scanner onResult={onScan} onClose={() => setScan(false)} />}
      {open && <Detail key={open.id} id={open.id} preload={open.preload} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  )
}
