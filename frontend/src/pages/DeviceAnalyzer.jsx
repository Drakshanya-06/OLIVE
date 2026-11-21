import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, Laptop, Monitor, Tablet, Battery, Plug, Tv, Cpu, Box, Camera, Sparkles } from 'lucide-react'
import { Button, Card, Field, Input, PageHeader, Select } from '../components/ui'
import AnalysisResult, { Advice } from '../components/AnalysisResult'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api, { errDetails, errMsg } from '../services/api'
import { label } from '../utils/format'

const ICONS = { smartphone: Smartphone, laptop: Laptop, desktop: Cpu, tablet: Tablet, battery: Battery, charger: Plug, television: Tv, monitor: Monitor, other: Box }

export default function DeviceAnalyzer() {
  const { user } = useAuth()
  const toast = useToast()
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [f, setF] = useState({ category: 'smartphone', brand: '', model: '', purchase_year: '', condition: 'working', weight_g: '' })
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [ai, setAi] = useState(null)
  const [fe, setFe] = useState({})
  const [out, setOut] = useState(null)
  const [advice, setAdvice] = useState([])
  const resRef = useRef(null)

  useEffect(() => { api.get('/devices/categories/').then((r) => setCats(r.data.results)) }, [])
  useEffect(() => { api.get('/devices/brands/', { params: { category: f.category } }).then((r) => setBrands(r.data.results)).catch(() => setBrands([])) }, [f.category])
  const models = brands.find((b) => b.brand.toLowerCase() === f.brand.trim().toLowerCase())?.models || []
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const recognize = async (file) => {
    if (!file) return
    setAiBusy(true); setAi(null)
    try {
      const fd = new FormData(); fd.append('image', file)
      const { data } = await api.post('/devices/recognize-image/', fd)
      setAi(data)
      if (data.suggestion?.category) setAi({ ...data })
    } catch (e) { toast.error(errMsg(e)) } finally { setAiBusy(false) }
  }
  const applySuggestion = () => { const s = ai.suggestion; setF({ ...f, category: s.category || f.category, brand: s.brand || f.brand, model: s.model || f.model }); setAi(null) }

  const submit = async (e) => {
    e.preventDefault(); setFe({}); setBusy(true)
    const body = { category: f.category, condition: f.condition }
    ;['brand', 'model', 'purchase_year', 'weight_g'].forEach((k) => f[k] !== '' && (body[k] = f[k]))
    try {
      let result
      if (user) {
        const fd = new FormData(); Object.entries(body).forEach(([k, v]) => fd.append(k, v)); if (photo) fd.append('photo', photo)
        const { data } = await api.post('/devices/analyze/', fd)
        result = { analysis: data.analysis, deviceId: data.device.id }
        toast.success('Analysis saved to your devices.')
      } else {
        const { data } = await api.post('/devices/estimate/', body)
        result = { analysis: data, deviceId: null }
      }
      setOut(result)
      api.get('/devices/recommend/', { params: { category: f.category } }).then((r) => setAdvice(r.data.advice)).catch(() => {})
      setTimeout(() => resRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    } catch (ex) { setFe(errDetails(ex)); toast.error(errMsg(ex)) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader title="Device analyzer" text="Tell us about your old device to see what it may contain and what a recycler might recover. Everything here is an estimate." />
      <form onSubmit={submit} className="space-y-6">
        <Card className="p-6">
          <h2 className="font-sans text-lg font-semibold">1. Device type</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {cats.map((c) => { const I = ICONS[c.key] || Box; const on = f.category === c.key; return (
              <button type="button" key={c.key} onClick={() => setF({ ...f, category: c.key })} aria-pressed={on} className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition-colors ${on ? 'border-brand-strong bg-soft text-brand' : 'border-line hover:bg-soft'}`}><I className="h-6 w-6" />{c.label}</button>) })}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-sans text-lg font-semibold">2. Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Brand" htmlFor="brand" error={fe.brand}><Input id="brand" list="brands" placeholder="e.g. Samsung" value={f.brand} onChange={set('brand')} /><datalist id="brands">{brands.map((b) => <option key={b.brand} value={b.brand} />)}</datalist></Field>
            <Field label="Model" htmlFor="model" error={fe.model} hint={brands.length ? 'Models we have reference data for appear as suggestions.' : 'Leave blank to use a category estimate.'}><Input id="model" list="models" value={f.model} onChange={set('model')} /><datalist id="models">{models.map((m) => <option key={m} value={m} />)}</datalist></Field>
            <Field label="Purchase year (optional)" htmlFor="py" error={fe.purchase_year}><Input id="py" type="number" min="1990" max={new Date().getFullYear()} value={f.purchase_year} onChange={set('purchase_year')} /></Field>
            <Field label="Condition" htmlFor="cond"><Select id="cond" value={f.condition} onChange={set('condition')}>{['working', 'damaged', 'not_working'].map((c) => <option key={c} value={c}>{label(c)}</option>)}</Select></Field>
            <Field label="Weight in grams (optional)" htmlFor="w" error={fe.weight_g} hint="Used to scale category estimates."><Input id="w" type="number" min="1" step="any" value={f.weight_g} onChange={set('weight_g')} /></Field>
            <Field label="Photo (optional)" htmlFor="photo" hint="JPG, PNG or WEBP up to 5 MB.">
              <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="input file:mr-3 file:rounded-lg file:border-0 file:bg-soft file:px-3 file:py-1 file:text-sm" onChange={(e) => { setPhoto(e.target.files[0] || null); setAi(null) }} />
            </Field>
          </div>
          {photo && user && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-soft p-3 text-sm">
              <Camera className="h-5 w-5 text-brand" /><span className="flex-1">Want help identifying the device from this photo?</span>
              <Button type="button" variant="secondary" loading={aiBusy} onClick={() => recognize(photo)}><Sparkles className="h-4 w-4" />Suggest from photo</Button>
            </div>
          )}
          {ai && (
            <div className="mt-3 rounded-xl border border-line p-3 text-sm" role="status">
              <p>{ai.message}</p>
              {ai.suggestion && (ai.suggestion.category || ai.suggestion.brand) && (
                <div className="mt-2 flex flex-wrap items-center gap-3"><span className="text-muted">Suggestion ({ai.suggestion.confidence} confidence): {[label(ai.suggestion.category), ai.suggestion.brand, ai.suggestion.model].filter(Boolean).join(' / ')}</span><Button type="button" variant="secondary" onClick={applySuggestion}>Use suggestion</Button></div>
              )}
            </div>
          )}
        </Card>
        <Button type="submit" loading={busy} className="w-full sm:w-auto">Analyze device</Button>
        {!user && <p className="text-sm text-muted">You are not signed in, so this estimate will not be saved. <Link to="/login" className="text-brand hover:underline">Sign in</Link> to save it and start a recycling request.</p>}
      </form>

      {out && (
        <div ref={resRef} className="mt-10 space-y-5">
          <AnalysisResult a={out.analysis} />
          <Advice items={advice} />
          <div className="flex flex-wrap gap-3">
            {out.deviceId ? <Link to={`/recycling?device=${out.deviceId}`} className="btn btn-primary">Start a recycling request</Link> : <Link to="/register" className="btn btn-primary">Create an account to recycle</Link>}
            <Link to="/facilities" className="btn btn-secondary">Find a facility</Link>
          </div>
        </div>
      )}
    </div>
  )
}
