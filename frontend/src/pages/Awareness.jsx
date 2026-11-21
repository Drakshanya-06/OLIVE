import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BatteryWarning, Flame, Droplet, Beaker, Zap, Smartphone, Monitor, Cable, HeartPulse, Trees, Recycle } from 'lucide-react'
import { Badge, Card, Modal, PageHeader } from '../components/ui'

const HAZARDS = [
  { id: 'lead', icon: Droplet, name: 'Lead', where: 'Solder on circuit boards; glass of older CRT screens.', hazard: 'Affects the nervous system, and children are more sensitive. Risk comes mainly from crude dismantling, dust or burning.', note: 'Intact devices do not expose you to meaningful lead.', tip: 'Do not break CRT glass. Hand TVs and monitors to facilities that list them.' },
  { id: 'mercury', icon: Beaker, name: 'Mercury', where: 'Backlights of some older LCD screens, certain lamps and switches.', hazard: 'Toxic to the nervous system and kidneys when released as vapour from broken lamps or burning.', note: 'Modern LED-backlit screens generally avoid it.', tip: 'Treat broken backlit screens as hazardous and avoid breathing dust or fumes.' },
  { id: 'cadmium', icon: AlertTriangle, name: 'Cadmium', where: 'Older nickel-cadmium rechargeable batteries; some coatings and components.', hazard: 'Can harm kidneys and bones; inhaled cadmium fumes or dust are a recognised carcinogen risk.', note: 'Exposure is a concern in informal burning or smelting, not in normal use.', tip: 'Take old rechargeable batteries to a facility that accepts batteries.' },
  { id: 'chromium', icon: Zap, name: 'Chromium compounds', where: 'Corrosion-protective coatings on some metal parts.', hazard: 'Hexavalent chromium can irritate skin and lungs and is linked to cancer with long inhalation exposure.', note: 'Mostly relevant to industrial handling and burning.', tip: 'Never grind, burn or acid-treat metal parts at home.' },
  { id: 'bfr', icon: Flame, name: 'Brominated flame retardants', where: 'Plastic casings and circuit boards.', hazard: 'Some persist in the environment, and burning plastics that contain them can release harmful by-products.', note: 'Controlled recycling treats these materials; open burning does not.', tip: 'Do not burn cables or casings.' },
  { id: 'li', icon: BatteryWarning, name: 'Lithium-ion batteries', where: 'Phones, laptops, tablets, power banks, e-bikes.', hazard: 'Punctured, crushed or short-circuited cells can overheat and ignite. They also contain cobalt, nickel and flammable electrolyte.', note: 'Fire risk is the main hazard, and it is avoidable with safe handling.', tip: 'Tape terminals, store swollen batteries in a non-flammable container and hand them to a facility.' },
]

const TYPES = [[Smartphone, 'Small IT and phones', 'Phones, tablets, routers, chargers'], [Monitor, 'Screens and monitors', 'TVs, monitors, laptops'], [Cable, 'Large and small equipment', 'Computers, printers, appliances'], [BatteryWarning, 'Batteries', 'Li-ion, Ni-Cd, power banks']]

export default function Awareness() {
  const [open, setOpen] = useState(null)
  const h = HAZARDS.find((x) => x.id === open)
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader title="Understand e-waste" text="What it is, what is inside, and what actually puts people and the environment at risk. We explain hazards without exaggerating everyday exposure." />

      <section className="grid gap-4 md:grid-cols-4">
        {TYPES.map(([I, t, d]) => <Card key={t} className="p-5"><I className="mb-3 h-6 w-6 text-brand" /><h3 className="font-sans font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></Card>)}
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">Hazardous materials: tap a card for details</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HAZARDS.map((x) => (
            <button key={x.id} onClick={() => setOpen(x.id)} className="card p-5 text-left transition-colors hover:border-brand-strong">
              <x.icon className="mb-3 h-6 w-6 text-warn" /><h3 className="font-sans text-lg font-semibold">{x.name}</h3><p className="mt-1 text-sm text-muted">{x.where}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-6 md:grid-cols-2">
        <Card className="p-6"><h2 className="flex items-center gap-2 text-xl font-semibold"><Trees className="h-5 w-5 text-brand" />Environmental effects</h2>
          <p className="mt-3 text-sm text-muted">When devices are dumped or burned informally, heavy metals and persistent chemicals can reach soil and groundwater, and smoke from burning plastics pollutes air. Landfilled devices also waste metals that could have been recovered.</p></Card>
        <Card className="p-6"><h2 className="flex items-center gap-2 text-xl font-semibold"><HeartPulse className="h-5 w-5 text-brand" />Human health effects</h2>
          <p className="mt-3 text-sm text-muted">Health risks are highest for people who dismantle or burn devices without protection, and for children living near such sites. Ordinary use of electronics is not a hazard. The aim is to move devices into controlled recycling.</p></Card>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">Responsible disposal</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-3">
          {['Back up and factory-reset the device.', 'Keep batteries in place unless swollen; never puncture or burn them.', 'Take it to a facility that lists your device type as accepted, then keep your QR code.'].map((t, i) => <li key={t} className="card flex gap-3 p-4 text-sm"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-soft font-semibold text-brand">{i + 1}</span>{t}</li>)}
        </ol>
      </section>

      <section className="mt-14 rounded-xl2 bg-soft p-8">
        <h2 className="text-2xl font-semibold">Awareness statistics</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><p className="font-display text-4xl font-semibold">62 million tonnes</p><p className="mt-1 text-sm text-muted">of e-waste generated worldwide in 2022.</p></div>
          <div><p className="font-display text-4xl font-semibold">about 22%</p><p className="mt-1 text-sm text-muted">documented as formally collected and recycled that year.</p></div>
        </div>
        <p className="mt-4 text-xs text-muted">Source: Global E-waste Monitor 2024 (UNITAR and ITU). Check the latest edition before quoting these figures in your report.</p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3"><Link to="/facilities" className="btn btn-primary"><Recycle className="h-4 w-4" />Find a facility</Link><Link to="/learning" className="btn btn-secondary">Take a quiz</Link></div>

      <Modal open={!!h} onClose={() => setOpen(null)} title={h?.name || ''}>
        {h && <div className="space-y-4 text-sm"><div><Badge tone="warn">Where it may occur</Badge><p className="mt-2">{h.where}</p></div><div><Badge tone="danger">Potential hazard</Badge><p className="mt-2">{h.hazard}</p></div><div><Badge tone="ok">Keep it in perspective</Badge><p className="mt-2">{h.note}</p></div><div className="rounded-xl bg-soft p-3"><strong>What to do: </strong>{h.tip}</div></div>}
      </Modal>
    </div>
  )
}
