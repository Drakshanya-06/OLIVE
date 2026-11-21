import { Link, Outlet } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import Logo from '../components/Logo'
import { useTheme } from '../context/ThemeContext'

export default function AuthLayout({ admin = false }) {
  const { theme, toggle } = useTheme()
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1C3215] via-[#16382F] to-[#0A4742] p-10 text-white lg:flex">
        <Logo light admin={admin} />
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight">{admin ? 'Verify devices. Keep rewards honest.' : 'Your old devices still hold value.'}</h2>
          <p className="mt-4 text-white/80">{admin ? 'Review requests, scan QR codes and credit points exactly once.' : 'Find a facility, see what can be recovered and earn points once your recycling is verified.'}</p>
        </div>
        <svg className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] opacity-15" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6c18 4 28 18 25 36-2 13-13 22-26 22-10 0-17-7-17-17C14 28 20 14 32 6z" fill="#2DD4BF" /></svg>
        <p className="relative z-10 text-sm text-teal-200/80">Recycle Smart. Recover Value. Protect Tomorrow.</p>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="lg:hidden"><Logo admin={admin} /></div>
          <Link to="/" className="hidden text-sm text-muted hover:text-brand lg:block">Back to website</Link>
          <button onClick={toggle} className="btn btn-ghost !px-2.5" aria-label="Toggle theme">{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6"><div className="w-full max-w-md"><Outlet /></div></div>
      </div>
    </div>
  )
}
