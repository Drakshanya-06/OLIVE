import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import { Crosshair, Search, MapPin, Phone, Clock, Navigation, Star, ShieldCheck, Mail } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageLoader, Select } from '../components/ui'
import api, { errMsg } from '../services/api'
import useFetch from '../hooks/useFetch'
import { cap, label } from '../utils/format'
import { useToast } from '../context/ToastContext'

const pin = (color) => L.divIcon({ className: '', iconSize: [28, 36], iconAnchor: [14, 34], popupAnchor: [0, -30],
  html: `<svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 1C7 1 2 6 2 12.500 2 21 14 35 14 35s12-14 12-22.500C26 6 21 1 14 1z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="12.500" r="4.500" fill="#fff"/></svg>` })
const ICONS = { verified: pin('#556B2F'), sample: pin('#b7791f'), other: pin('#708238') }
const youIcon = L.divIcon({ className: '', iconSize: [18, 18], html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb55"></div>' })

function Recenter({ center, zoom }) { const map = useMap(); useEffect(() => { map.setView(center, zoom) }, [center, zoom, map]); return null }

export default function Facilities() {
  const toast = useToast()
  const [sp] = useSearchParams()
  const [text, setText] = useState(sp.get('q') || '')
  const [center, setCenter] = useState(null)
  const [centerLabel, setCenterLabel] = useState('')
  const [textFilter, setTextFilter] = useState(sp.get('q') || '')
  const [f, setF] = useState({ radius_km: '', type: '', accepts: '', status: '', verified: '' })
  const [selected, setSelected] = useState(null)
  const [searching, setSearching] = useState(false)
  const { data: cats } = useFetch('/devices/categories/')

  const params = useMemo(() => {
    const p = { page_size: 200 }
    Object.entries(f).forEach(([k, v]) => v && (p[k] = v))
    if (center) { p.lat = center[0]; p.lng = center[1] } else if (textFilter) p.q = textFilter
    return p
  }, [f, center, textFilter])
  const { data, loading, error, reload } = useFetch('/facilities/', { params })
  const items = data?.results || []

  useEffect(() => { if (sp.get('q')) search(sp.get('q')) /* eslint-disable-next-line */ }, [])

  async function search(value = text) {
    const q = value.trim()
    if (!q) { setCenter(null); setTextFilter(''); setCenterLabel(''); return }
    setSearching(true)
    try {
      const { data: g } = await api.get('/facilities/geocode/', { params: { q } })
      setCenter([g.lat, g.lng]); setCenterLabel(q); setTextFilter('')
    } catch (e) { setCenter(null); setTextFilter(q); toast.error(errMsg(e) + ' Showing text matches instead.') }
    finally { setSearching(false) }
  }
  const locate = () => {
    if (!navigator.geolocation) return toast.error('Your browser does not support location.')
    navigator.geolocation.getCurrentPosition(
      (p) => { setCenter([p.coords.latitude, p.coords.longitude]); setCenterLabel('your location'); setTextFilter(''); setText('') },
      (err) => toast.error(err.code === 1 ? 'Location permission was denied. Search by city or PIN code instead.' : 'Could not get your location. Search by city or PIN code instead.'),
      { enableHighAccuracy: false, timeout: 10000 })
  }
  const mapCenter = center || (items[0] ? [items[0].latitude, items[0].longitude] : [30.9, 75.85])
  const sel = items.find((i) => i.id === selected)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">Find an e-waste facility</h1>
      <p className="mt-2 max-w-2xl text-muted">Search by city or PIN code, or use your location. Records marked <Badge tone="sample">Sample</Badge> are demonstration data, not real facilities.</p>

      <Card className="mt-6 p-4">
        <form onSubmit={(e) => { e.preventDefault(); search() }} className="flex flex-wrap gap-2">
          <div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input aria-label="City or PIN code" className="!pl-10" placeholder="City or 6-digit PIN code" value={text} onChange={(e) => setText(e.target.value)} /></div>
          <Button type="submit" loading={searching}>Search</Button>
          <Button type="button" variant="secondary" onClick={locate}><Crosshair className="h-4 w-4" />Use my location</Button>
        </form>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Distance"><Select disabled={!center} value={f.radius_km} onChange={(e) => setF({ ...f, radius_km: e.target.value })}><option value="">{center ? 'Any distance' : 'Search a place first'}</option>{[5, 10, 25, 50, 100].map((r) => <option key={r} value={r}>Within {r} km</option>)}</Select></Field>
          <Field label="Facility type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">All types</option><option value="government">Government</option><option value="private">Private</option><option value="ngo">NGO</option></Select></Field>
          <Field label="Accepts"><Select value={f.accepts} onChange={(e) => setF({ ...f, accepts: e.target.value })}><option value="">Any waste</option>{(cats?.results || []).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select></Field>
          <Field label="Operating status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Any</option><option value="operational">Operational</option><option value="temporarily_closed">Temporarily closed</option><option value="closed">Closed</option></Select></Field>
          <Field label="Verification"><Select value={f.verified} onChange={(e) => setF({ ...f, verified: e.target.value })}><option value="">All records</option><option value="true">Verified only</option></Select></Field>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-[420px] overflow-hidden rounded-xl2 border border-line lg:sticky lg:top-24 lg:h-[640px]">
          <MapContainer center={mapCenter} zoom={center ? 11 : 8} scrollWheelZoom className="h-full w-full">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Recenter center={sel ? [sel.latitude, sel.longitude] : mapCenter} zoom={sel ? 13 : center ? 11 : 8} />
            {center && <><Marker position={center} icon={youIcon}><Popup>Search centre: {centerLabel}</Popup></Marker>{f.radius_km && <Circle center={center} radius={Number(f.radius_km) * 1000} pathOptions={{ color: '#708238', weight: 1 }} />}</>}
            {items.map((i) => (
              <Marker key={i.id} position={[i.latitude, i.longitude]} icon={ICONS[i.verification_status] || ICONS.other} eventHandlers={{ click: () => setSelected(i.id) }}>
                <Popup><strong>{i.name}</strong><br />{i.city}{i.distance_km !== undefined && ` - ${i.distance_km} km`}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="space-y-3">
          {loading ? <PageLoader text="Loading facilities..." /> : error ? <ErrorState message={error} onRetry={reload} /> : !items.length ? (
            <EmptyState icon={MapPin} title="No facilities match" text="Try a larger distance, remove a filter or search a nearby city." />
          ) : (
            <>
              <p className="text-sm text-muted">{items.length} {items.length === 1 ? 'facility' : 'facilities'}{centerLabel && ` near ${centerLabel}`}</p>
              {items.map((i) => (
                <Card key={i.id} className={`cursor-pointer p-4 transition-colors ${selected === i.id ? 'border-brand-strong' : ''}`} onClick={() => setSelected(i.id)}>
                  <div className="flex flex-wrap items-center gap-2">
                    {i.verification_status === 'verified' ? <Badge tone="ok"><ShieldCheck className="h-3 w-3" />Verified</Badge> : <Badge tone="sample">{i.verification_status === 'sample' ? 'Sample data' : cap(i.verification_status)}</Badge>}
                    <Badge>{label(i.facility_type)}</Badge><Badge tone={i.operating_status === 'operational' ? 'ok' : 'warn'}>{label(i.operating_status)}</Badge>
                    {i.distance_km !== undefined && <span className="ml-auto text-sm font-semibold text-brand">{i.distance_km} km</span>}
                  </div>
                  <h3 className="mt-2 font-sans text-base font-semibold">{i.name}</h3>
                  <p className="text-sm text-muted">{i.address}{i.pincode && `, ${i.pincode}`}</p>
                  {selected === i.id && (
                    <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
                      {i.description && <p className="text-muted">{i.description}</p>}
                      {i.operating_hours && <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted" />{i.operating_hours}</p>}
                      <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted" />{i.phone || 'Phone not listed'}</p>
                      {i.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted" />{i.email}</p>}
                      <p className="flex items-center gap-2"><Star className="h-4 w-4 text-muted" />{i.rating_count ? `${i.rating_avg} from ${i.rating_count} reviews` : 'No reviews yet'}</p>
                      <div className="flex flex-wrap gap-1.5">{i.accepted_categories.map((c) => <Badge key={c}>{cap(c)}</Badge>)}</div>
                      {i.data_source && <p className="text-xs text-muted">Source: {i.data_source}</p>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${i.latitude},${i.longitude}`}><Navigation className="h-4 w-4" />Directions</a>
                        <Link className="btn btn-primary" to={`/recycling?facility=${i.id}`}>Recycle here</Link>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
