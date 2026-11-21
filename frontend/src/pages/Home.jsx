import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ScanLine, MapPin, Recycle, Gift, ShieldCheck, Leaf, Smartphone, Laptop, BatteryCharging, ChevronDown, Star, Factory, Droplets } from 'lucide-react'
import { Badge, Button, Card, Select } from '../components/ui'
import api from '../services/api'
import useFetch from '../hooks/useFetch'
import { fmtNum, matColor, mgToText, cap } from '../utils/format'

function QuickEstimate() {
  const [cats, setCats] = useState([])
  const [cat, setCat] = useState('smartphone')
  const [res, setRes] = useState(null)
  useEffect(() => { api.get('/devices/categories/').then((r) => setCats(r.data.results)).catch(() => {}) }, [])
  useEffect(() => { api.post('/devices/estimate/', { category: cat }).then((r) => setRes(r.data)).catch(() => setRes(null)) }, [cat])
  const top = res?.materials?.slice(0, 5) || []
  const max = Math.max(...top.map((m) => Math.sqrt(m.estimated_recoverable_mg)), 1)
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">What could your old device give back?</h2>
        <Badge tone="sample">Category estimate</Badge>
      </div>
      <div className="mt-4"><Select aria-label="Device category" value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select></div>
      <div className="mt-5 space-y-3" aria-live="polite">
        {top.map((m) => (
          <div key={m.material}>
            <div className="mb-1 flex justify-between text-sm"><span>{cap(m.material)}</span><span className="text-muted">{mgToText(m.estimated_recoverable_mg)}</span></div>
            <div className="h-2.5 rounded-full bg-soft"><div className="bar-grow h-full rounded-full" key={cat + m.material} style={{ width: `${(Math.sqrt(m.estimated_recoverable_mg) / max) * 100}%`, background: matColor(m.material) }} /></div>
          </div>
        ))}
      </div>
      {res && <p className="mt-5 text-sm text-muted">Up to about <strong className="text-ink">{fmtNum(res.preliminary_points)} points</strong> once recycling is verified. Estimates use placeholder reference data until your administrator loads cited figures.</p>}
      <Link to="/device-analyzer" className="btn btn-primary mt-5 w-full">Analyze my exact device</Link>
    </Card>
  )
}

const FAQ = [
  ['Do I get points as soon as I submit a request?', 'No. You see a preliminary estimate, but final points are credited only after a facility verifies your device.'],
  ['Are the metal amounts exact?', 'No. They are estimates from a reference database that administrators can update. We label whether an estimate is model-specific or category-based, and we separate estimated content, estimated recoverable amount and verified recovery.'],
  ['Are the listed facilities real?', 'Records marked Sample are fictional demo data. Real facilities appear only when an administrator imports them from a verified source and marks them verified.'],
  ['What happens to my data on the device?', 'Back up and factory-reset before handing over. Our preparation guide in the Learning hub lists the steps.'],
  ['Is it free?', 'Yes. OLIVE does not charge users.'],
]

const TESTIMONIALS = [
  ['Placeholder quote: the facility map made it obvious where to take my old phone.', 'Sample user A'],
  ['Placeholder quote: seeing what is inside a laptop changed how I think about throwing it away.', 'Sample user B'],
  ['Placeholder quote: the QR code made the drop-off quick.', 'Sample user C'],
]

export default function Home() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const { data: stats } = useFetch('/public/stats/')
  const { data: fac } = useFetch('/facilities/', { params: { page_size: 3 } })
  const search = (e) => { e.preventDefault(); nav(`/facilities?q=${encodeURIComponent(q)}`) }

  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-cream/60 to-bg dark:from-soft">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <h1 className="text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl">Your old phone is a small mine. Recycle it properly.</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">OLIVE finds a nearby e-waste facility, shows what your device may contain, and rewards you with points after your recycling is verified.</p>
            <form onSubmit={search} className="mt-8 flex max-w-xl gap-2">
              <div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="input !pl-10" aria-label="City or PIN code" placeholder="City or PIN code, e.g. Ludhiana" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <Button type="submit">Search</Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/facilities" className="btn btn-secondary"><MapPin className="h-4 w-4" />Explore recycling</Link>
              <Link to="/device-analyzer" className="btn btn-secondary"><ScanLine className="h-4 w-4" />Analyze your old device</Link>
            </div>
          </div>
          <QuickEstimate />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[[stats?.users, 'Registered recyclers'], [stats?.devices_recycled, 'Devices verified'], [stats?.facilities, stats?.facilities_are_sample ? 'Facilities (sample data)' : 'Facilities listed'], [stats?.co2e_avoided_kg, 'kg CO2e avoided (estimate)']].map(([v, l]) => (
            <Card key={l} className="p-5"><p className="font-display text-3xl font-semibold">{v === undefined ? '...' : fmtNum(v, 1)}</p><p className="mt-1 text-sm text-muted">{l}</p></Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Live numbers from this platform's database, not national statistics.</p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h2 className="max-w-xl text-3xl font-semibold">From drawer to verified reward in five steps</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-5">
          {[[Search, 'Find a facility', 'Search by city, PIN code or your location.'], [ScanLine, 'Analyze the device', 'Enter the model or upload a photo.'], [Recycle, 'Submit a request', 'Choose drop-off or pickup and get a QR code.'], [ShieldCheck, 'Get verified', 'The facility scans your QR code.'], [Gift, 'Earn points', 'Points are credited once, after verification.']].map(([Icon, t, d], i) => (
            <li key={t} className="card p-5"><span className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand"><span className="grid h-7 w-7 place-items-center rounded-full bg-soft">{i + 1}</span><Icon className="h-4 w-4" /></span><h3 className="font-sans text-base font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 rounded-xl2 bg-gradient-to-br from-[#1C3215] via-[#122B26] to-[#0A221E] border border-teal-800/30 p-8 text-white md:grid-cols-2 md:p-12 shadow-xl shadow-teal-950/10">
          <div>
            <h2 className="text-3xl font-semibold">Why not just bin it?</h2>
            <p className="mt-4 text-white/80">Phones, laptops and batteries contain copper, silver, gold and other recoverable metals, along with substances such as lead, cadmium or flammable battery cells that should never be burned or landfilled.</p>
            <Link to="/awareness" className="btn mt-6 bg-teal-400 text-teal-950 hover:bg-teal-300 font-semibold shadow-md">Read the awareness hub</Link>
          </div>
          <ul className="space-y-4 text-sm">
            {[[Factory, 'Formal recycling recovers metals', 'Controlled processes capture valuable materials and treat hazardous parts.'], [Droplets, 'Improper disposal can pollute', 'Open burning and dumping can release harmful substances into soil, water and air.'], [Leaf, 'Recovery reduces new mining', 'Reusing metals means less raw material has to be extracted.']].map(([Icon, t, d]) => (
              <li key={t} className="flex gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" /><span><strong className="block">{t}</strong><span className="text-white/75">{d}</span></span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4"><h2 className="text-3xl font-semibold">Facilities near you</h2><Link to="/facilities" className="text-sm font-semibold text-brand hover:underline">See the map</Link></div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {(fac?.results || []).map((f) => (
            <Card key={f.id} className="p-5">
              <div className="flex flex-wrap gap-2"><Badge tone={f.verification_status === 'verified' ? 'ok' : 'sample'}>{f.verification_status === 'sample' ? 'Sample data' : cap(f.verification_status)}</Badge><Badge>{cap(f.facility_type)}</Badge></div>
              <h3 className="mt-3 font-sans text-base font-semibold">{f.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><MapPin className="h-4 w-4" />{f.city}, {f.state}</p>
              <p className="mt-2 text-xs text-muted">{f.accepted_categories.map(cap).join(', ')}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-2">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold">Estimated content is not recovered material</h2>
          <p className="mt-3 text-muted">We keep three numbers apart so the app never overpromises.</p>
          <dl className="mt-5 space-y-3 text-sm">
            {[['Estimated content', 'What a reference source says is inside the device.'], ['Estimated recoverable', 'Content multiplied by a recovery rate and the device condition.'], ['Verified recovery', 'Entered by an administrator after real verification.']].map(([t, d]) => <div key={t} className="rounded-xl bg-soft p-3"><dt className="font-semibold">{t}</dt><dd className="text-muted">{d}</dd></div>)}
          </dl>
        </Card>
        <Card className="p-8">
          <h2 className="text-2xl font-semibold">Points that cannot be gamed</h2>
          <p className="mt-3 text-muted">Every point sits in a ledger with a transaction ID. You cannot change your own balance, and each recycling request can be credited only once.</p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
            {[[Smartphone, 'Analyze'], [BatteryCharging, 'Verify'], [Gift, 'Redeem']].map(([I, t]) => <div key={t} className="rounded-xl bg-soft p-4"><I className="mx-auto mb-2 h-6 w-6 text-brand" />{t}</div>)}
          </div>
          <Link to="/rewards" className="btn btn-secondary mt-5">See rewards</Link>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-semibold">What people say</h2>
        <p className="mt-1 text-sm text-muted">Placeholder quotes for the academic demo. Replace with real feedback.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map(([t, a]) => <Card key={a} className="p-6"><div className="mb-3 flex gap-0.5 text-warn">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div><p className="text-sm">{t}</p><p className="mt-3 text-xs text-muted">{a}</p></Card>)}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-3xl font-semibold">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" /></summary><p className="mt-3 text-sm text-muted">{a}</p></details>
          ))}
        </div>
      </section>
    </>
  )
}
