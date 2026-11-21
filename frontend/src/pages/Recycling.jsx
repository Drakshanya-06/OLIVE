import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { QrCode, Plus, Star, XCircle, Recycle } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Pagination, Select, Textarea } from '../components/ui'
import { StatusBadge, StatusTimeline } from '../components/RequestStatus'
import { useToast } from '../context/ToastContext'
import api, { errDetails, errMsg, mediaUrl } from '../services/api'
import useFetch from '../hooks/useFetch'
import { cap, fmtDate, fmtNum, label, todayISO } from '../utils/format'

function NewRequest({ onCreated }) {
  const toast = useToast()
  const [sp] = useSearchParams()
  const { data: devs } = useFetch('/devices/my/', { params: { page_size: 100 } })
  const { data: facs } = useFetch('/facilities/', { params: { status: 'operational', page_size: 200 } })
  const [f, setF] = useState({ device_id: sp.get('device') || '', facility_id: sp.get('facility') || '', method: 'drop_off', pickup_address: '', preferred_date: '', notes: '' })
  const [photos, setPhotos] = useState([])
  const [fe, setFe] = useState({})
  const [busy, setBusy] = useState(false)
  const available = (devs?.results || []).filter((d) => d.status === 'analyzed')
  const device = available.find((d) => d.id === f.device_id)
  const facilities = useMemo(() => (facs?.results || []).filter((x) => !device || x.accepted_categories.includes(device.category)), [facs, device])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setFe({}); setBusy(true)
    try {
      const fd = new FormData(); Object.entries(f).forEach(([k, v]) => v && fd.append(k, v)); photos.forEach((p) => fd.append('photos', p))
      const { data } = await api.post('/recycling/requests/', fd)
      toast.success(`Request ${data.request_code} submitted.`)
      setF({ ...f, device_id: '', pickup_address: '', notes: '' }); setPhotos([]); onCreated(data)
    } catch (ex) { setFe(errDetails(ex)); toast.error(errMsg(ex)) } finally { setBusy(false) }
  }

  if (devs && !available.length) return <EmptyState icon={Recycle} title="No analyzed devices waiting" text="Analyze a device first. It will appear here ready to submit." action={<Link to="/device-analyzer" className="btn btn-primary">Analyze a device</Link>} />
  return (
    <Card className="p-6">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Device" htmlFor="dev" error={fe.device_id}><Select id="dev" required value={f.device_id} onChange={set('device_id')}><option value="">Select analyzed device</option>{available.map((d) => <option key={d.id} value={d.id}>{label(d.category)} - {d.brand || 'Generic'} {d.model} ({fmtNum(d.analysis?.preliminary_points)} pts est.)</option>)}</Select></Field>
        <Field label="Facility" htmlFor="fac" error={fe.facility_id} hint={device ? `Showing facilities that accept ${label(device.category)}.` : 'Choose a device first to filter facilities.'}><Select id="fac" required value={f.facility_id} onChange={set('facility_id')}><option value="">Select facility</option>{facilities.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.city}){x.verification_status === 'sample' ? ' - sample' : ''}</option>)}</Select></Field>
        <Field label="Method" htmlFor="m"><Select id="m" value={f.method} onChange={set('method')}><option value="drop_off">I will drop it off</option><option value="pickup">Request a pickup</option></Select></Field>
        <Field label="Preferred date" htmlFor="d" error={fe.preferred_date}><Input id="d" type="date" required min={todayISO()} value={f.preferred_date} onChange={set('preferred_date')} /></Field>
        {f.method === 'pickup' && <div className="sm:col-span-2"><Field label="Pickup address" htmlFor="pa" error={fe.pickup_address}><Textarea id="pa" value={f.pickup_address} onChange={set('pickup_address')} /></Field></div>}
        <div className="sm:col-span-2"><Field label="Notes (optional)" htmlFor="n"><Input id="n" maxLength={500} value={f.notes} onChange={set('notes')} /></Field></div>
        <div className="sm:col-span-2"><Field label="Device photos (up to 4)" htmlFor="ph" hint="JPG, PNG or WEBP, 5 MB each."><input id="ph" type="file" multiple accept="image/jpeg,image/png,image/webp" className="input file:mr-3 file:rounded-lg file:border-0 file:bg-soft file:px-3 file:py-1 file:text-sm" onChange={(e) => setPhotos([...e.target.files].slice(0, 4))} /></Field></div>
        <div className="sm:col-span-2"><Button type="submit" loading={busy}><Plus className="h-4 w-4" />Submit request</Button></div>
      </form>
    </Card>
  )
}

function ReviewModal({ req, onClose, onDone }) {
  const toast = useToast()
  const [rating, setRating] = useState(5); const [comment, setComment] = useState(''); const [busy, setBusy] = useState(false)
  const go = async () => { setBusy(true); try { await api.post(`/facilities/${req.facility.id}/reviews/`, { rating, comment }); toast.success('Thanks for your review.'); onDone() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) } }
  return (
    <Modal open onClose={onClose} title={`Rate ${req.facility?.name}`}>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`} aria-checked={rating === n} role="radio"><Star className={`h-8 w-8 ${n <= rating ? 'fill-warn text-warn' : 'text-line'}`} /></button>)}</div>
      <div className="mt-4"><Field label="Comment (optional)"><Textarea maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} /></Field></div>
      <Button className="mt-4" loading={busy} onClick={go}>Submit review</Button>
    </Modal>
  )
}

export default function Recycling() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const { data, loading, error, reload } = useFetch('/recycling/requests/', { params: { page, status: status || undefined } })
  const [qr, setQr] = useState(null)
  const [review, setReview] = useState(null)
  const [showNew, setShowNew] = useState(true)
  useEffect(() => { if (data && !data.count && !status) setShowNew(true) }, [data, status])

  const openQr = async (r) => { try { const { data: q } = await api.get(`/recycling/requests/${r.id}/qr/`); setQr({ ...q, req: r }) } catch (e) { toast.error(errMsg(e)) } }
  const cancel = async (r) => { if (!window.confirm('Cancel this request?')) return; try { await api.post(`/recycling/requests/${r.id}/cancel/`); toast.success('Request cancelled.'); reload() } catch (e) { toast.error(errMsg(e)) } }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader title="Recycling requests" text="Submit a request, show your QR code at the facility and follow each step until your reward is credited."><Button variant="secondary" onClick={() => setShowNew(!showNew)}>{showNew ? 'Hide form' : 'New request'}</Button></PageHeader>
      {showNew && <div className="mb-10"><NewRequest onCreated={() => { setPage(1); reload() }} /></div>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Your requests</h2>
        <Select aria-label="Filter by status" className="!w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option>{['submitted', 'under_review', 'approved', 'collected', 'verified', 'completed', 'rejected', 'cancelled'].map((s) => <option key={s} value={s}>{cap(s.replace('_', ' '))}</option>)}</Select>
      </div>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : !data.results.length ? <EmptyState icon={Recycle} title="No requests yet" text="Your submitted requests and their progress will show up here." /> : (
        <div className="space-y-4">
          {data.results.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-mono text-sm font-semibold">{r.request_code}</p><h3 className="mt-1 font-sans text-lg font-semibold">{cap(r.device?.category || '')} {r.device?.brand} {r.device?.model}</h3><p className="text-sm text-muted">{r.facility?.name} - {label(r.method)} - {fmtDate(r.preferred_date)}</p></div>
                <div className="text-right"><StatusBadge status={r.status} /><p className="mt-2 text-sm">{r.reward_credited ? <span className="font-semibold text-ok">+{fmtNum(r.final_points)} points credited</span> : <span className="text-muted">~{fmtNum(r.estimated_points)} points pending</span>}</p></div>
              </div>
              <div className="mt-5"><StatusTimeline request={r} /></div>
              {!!r.photos?.length && <div className="mt-4 flex gap-2">{r.photos.map((p) => <img key={p} src={mediaUrl(p)} alt="Device" className="h-14 w-14 rounded-lg object-cover" />)}</div>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openQr(r)}><QrCode className="h-4 w-4" />Show QR code</Button>
                {['submitted', 'under_review'].includes(r.status) && <Button variant="ghost" onClick={() => cancel(r)}><XCircle className="h-4 w-4" />Cancel</Button>}
                {['verified', 'completed'].includes(r.status) && !r.reviewed && <Button variant="secondary" onClick={() => setReview(r)}><Star className="h-4 w-4" />Rate facility</Button>}
                {r.reviewed && <Badge tone="ok">Reviewed</Badge>}
              </div>
            </Card>
          ))}
          <Pagination page={data.page} totalPages={data.total_pages} onChange={setPage} />
        </div>
      )}

      <Modal open={!!qr} onClose={() => setQr(null)} title="Your recycling QR code">
        {qr && <div className="text-center"><img src={qr.qr_image} alt={`QR code for ${qr.request_code}`} className="mx-auto h-60 w-60 rounded-xl border border-line bg-white p-2" /><p className="mt-3 font-mono font-semibold">{qr.request_code}</p><p className="mt-1 text-sm text-muted">Show this at the facility. It is unique to this request and can earn points only once.</p>{!['approved', 'collected'].includes(qr.req.status) && <p className="mt-3 rounded-lg bg-soft p-2 text-xs text-muted">Status is {qr.req.status.replace('_', ' ')}. The facility can verify it once the request is approved.</p>}<a className="btn btn-secondary mt-4" href={qr.qr_image} download={`${qr.request_code}.png`}>Download PNG</a></div>}
      </Modal>
      {review && <ReviewModal req={review} onClose={() => setReview(null)} onDone={() => { setReview(null); reload() }} />}
    </div>
  )
}
