import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, Moon, Sun, Bell, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { cx } from './ui'

const LINKS = [
  ['/facilities', 'Find facilities'], ['/device-analyzer', 'Device analyzer'], ['/recycling', 'Recycle'],
  ['/rewards', 'Rewards'], ['/learning', 'Learn'], ['/awareness', 'Awareness'],
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, logout, isAdmin } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()
  const linkCls = ({ isActive }) => cx('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-soft text-brand' : 'text-ink/80 hover:bg-soft hover:text-ink')

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {LINKS.map(([to, text]) => <NavLink key={to} to={to} className={linkCls}>{text}</NavLink>)}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="btn btn-ghost !px-2.5" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user ? (
            <div className="hidden items-center gap-1 sm:flex">
              {isAdmin && <Link to="/admin/dashboard" className="btn btn-ghost !px-2.5 text-teal-600 dark:text-teal-400" title="Admin portal"><ShieldCheck className="h-5 w-5" /></Link>}
              <Link to="/dashboard" className="btn btn-secondary"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
              <button onClick={async () => { await logout(); nav('/') }} className="btn btn-ghost !px-2.5" aria-label="Sign out"><LogOut className="h-5 w-5" /></button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn btn-ghost">Sign in</Link>
              <Link to="/register" className="btn btn-primary">Create account</Link>
              <span className="h-4 w-px bg-line mx-1" aria-hidden="true" />
              <Link to="/admin/login" className="btn btn-secondary !px-3 text-xs" title="Admin Portal">
                <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Admin</span>
              </Link>
            </div>
          )}
          <button className="btn btn-ghost !px-2.5 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-bg px-4 pb-4 pt-2 lg:hidden">
          <div className="flex flex-col">
            {LINKS.map(([to, text]) => <NavLink key={to} to={to} className={linkCls} onClick={() => setOpen(false)}>{text}</NavLink>)}
            <div className="mt-3 flex flex-wrap gap-2">
              {user ? (
                <>
                  <Link to="/dashboard" className="btn btn-primary" onClick={() => setOpen(false)}>Dashboard</Link>
                  {isAdmin && <Link to="/admin/dashboard" className="btn btn-secondary" onClick={() => setOpen(false)}>Admin</Link>}
                  <button className="btn btn-secondary" onClick={async () => { await logout(); setOpen(false); nav('/') }}>Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary" onClick={() => setOpen(false)}>Sign in</Link>
                  <Link to="/register" className="btn btn-primary" onClick={() => setOpen(false)}>Create account</Link>
                  <Link to="/admin/login" className="btn btn-ghost border border-line" onClick={() => setOpen(false)}>Admin Portal</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
