import { Link } from 'react-router-dom'
import { Mail, MapPin } from 'lucide-react'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-soft">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted">Recycle Smart. Recover Value. Protect Tomorrow. A student project that helps people find facilities, understand what is inside their devices and recycle responsibly.</p>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted"><Mail className="h-4 w-4" /> hello@olive.example (placeholder)</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted"><MapPin className="h-4 w-4" /> Punjab, India</p>
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-semibold">Explore</h3>
          <ul className="space-y-2 text-sm text-muted">
            {[['/facilities', 'Find facilities'], ['/device-analyzer', 'Device analyzer'], ['/recycling', 'Recycling requests'], ['/rewards', 'Rewards']].map(([to, t]) => <li key={to}><Link className="hover:text-brand" to={to}>{t}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-semibold">Learn</h3>
          <ul className="space-y-2 text-sm text-muted">
            {[['/awareness', 'Awareness hub'], ['/learning', 'Articles and quizzes'], ['/#faq', 'FAQ'], ['/admin/login', 'Admin sign in']].map(([to, t]) => <li key={to}><Link className="hover:text-brand" to={to}>{t}</Link></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        Academic project. Facility records and material figures marked as sample are for demonstration only. Map data from OpenStreetMap contributors.
      </div>
    </footer>
  )
}
