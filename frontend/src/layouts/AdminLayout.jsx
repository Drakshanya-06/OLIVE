import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, MapPin, Cpu, Recycle, Gift, BookOpen, BarChart3, Settings, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const NAV = [['/admin/dashboard', 'Dashboard', LayoutDashboard], ['/admin/recycling-requests', 'Recycling requests', Recycle], ['/admin/facilities', 'Facilities', MapPin], ['/admin/devices', 'Device reference', Cpu], ['/admin/rewards', 'Rewards', Gift], ['/admin/learning', 'Learning', BookOpen], ['/admin/users', 'Users', Users], ['/admin/reports', 'Reports', BarChart3], ['/admin/settings', 'Settings', Settings]]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const links = (
    <nav className="space-y-1" aria-label="Admin">
      {NAV.map(([to, t, I]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive ? 'bg-teal-500/20 text-teal-300 font-semibold shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}><I className="h-4 w-4 text-teal-400" />{t}</NavLink>)}
    </nav>
  )
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden bg-gradient-to-b from-[#1C3215] via-[#122B26] to-[#0A221E] border-r border-teal-900/30 p-4 lg:block dark:from-[#0D1812] dark:to-[#071412]"><div className="sticky top-4"><div className="mb-8 px-2"><Logo to="/admin/dashboard" admin light /></div>{links}</div></aside>
      {open && <div className="fixed inset-0 z-[800] bg-ink/50 lg:hidden" onClick={() => setOpen(false)}><aside className="h-full w-64 bg-gradient-to-b from-[#1C3215] via-[#122B26] to-[#0A221E] p-4" onClick={(e) => e.stopPropagation()}><div className="mb-6 flex items-center justify-between"><Logo to="/admin/dashboard" admin light /><button className="text-white" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>{links}</aside></div>}
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur sm:px-6">
          <button className="btn btn-ghost !px-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <p className="hidden text-sm text-muted lg:block">Signed in as <strong className="text-ink">{user?.name}</strong> ({user?.role === 'super_admin' ? 'Super admin' : 'Admin'})</p>
          <div className="flex items-center gap-1"><button onClick={toggle} className="btn btn-ghost !px-2.5" aria-label="Toggle theme">{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button><button onClick={async () => { await logout(); nav('/admin/login') }} className="btn btn-ghost"><LogOut className="h-4 w-4" />Sign out</button></div>
        </header>
        <main className="p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
