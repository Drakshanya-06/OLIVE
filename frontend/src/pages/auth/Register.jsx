import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserCheck, ShieldCheck } from 'lucide-react'
import { Button, Field, Input } from '../../components/ui'
import api, { errDetails, errMsg } from '../../services/api'

export default function Register() {
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm_password: '' })
  const [err, setErr] = useState('')
  const [fe, setFe] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setFe({})
    if (f.password !== f.confirm_password) return setFe({ confirm_password: 'Passwords do not match.' })
    setBusy(true)
    try {
      const { data } = await api.post('/auth/register/', f)
      nav('/verify-otp', { state: { email: f.email.toLowerCase(), dev_otp: data?.dev_otp } })
    } catch (ex) { setErr(errMsg(ex)); setFe(errDetails(ex)) } finally { setBusy(false) }
  }

  return (
    <div>
      {/* 2-Portal Switcher Tabs */}
      <div className="mb-6 flex rounded-xl border border-line bg-surface p-1 text-sm font-medium shadow-sm">
        <div className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-olive-900 to-teal-700 py-2 text-center text-white shadow-sm">
          <UserCheck className="h-4 w-4" />
          User Portal
        </div>
        <Link
          to="/admin/login"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-center text-muted transition-all hover:bg-soft hover:text-ink"
        >
          <ShieldCheck className="h-4 w-4" />
          Admin Portal
        </Link>
      </div>

      <h1 className="text-3xl font-semibold">Create your user account</h1>
      <p className="mt-2 text-muted">Sign up to recycle devices, track metal recovery, and earn verified rewards.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        {err && !Object.keys(fe).length && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{err}</p>}
        <Field label="Full name" htmlFor="name" error={fe.name}><Input id="name" autoComplete="name" value={f.name} onChange={set('name')} /></Field>
        <Field label="Email" htmlFor="email" error={fe.email}><Input id="email" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone number" htmlFor="phone" error={fe.phone}><Input id="phone" type="tel" autoComplete="tel" placeholder="9876543210" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Password" htmlFor="password" error={fe.password} hint="At least 8 characters with a letter and a number."><Input id="password" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} /></Field>
        <Field label="Confirm password" htmlFor="cpw" error={fe.confirm_password}><Input id="cpw" type="password" autoComplete="new-password" value={f.confirm_password} onChange={set('confirm_password')} /></Field>
        <Button type="submit" loading={busy} className="w-full">Create account</Button>
      </form>
      <p className="mt-6 text-sm text-muted">Already registered? <Link to="/login" className="text-brand hover:underline font-medium">Sign in</Link></p>
    </div>
  )
}
