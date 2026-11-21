import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Field, Input } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import api, { errDetails, errMsg } from '../../services/api'

export default function ResetPassword() {
  const { state } = useLocation()
  const nav = useNavigate()
  const toast = useToast()
  const [f, setF] = useState({ email: state?.email || '', otp: '', new_password: '', confirm_password: '' })
  const [err, setErr] = useState('')
  const [fe, setFe] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setFe({}); setBusy(true)
    try { await api.post('/auth/reset-password/', f); toast.success('Password updated. Sign in with your new password.'); nav('/login') }
    catch (ex) { setErr(errMsg(ex)); setFe(errDetails(ex)) } finally { setBusy(false) }
  }
  return (
    <div>
      <h1 className="text-3xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-muted">Enter the code from your email and a new password.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{err}</p>}
        <Field label="Email" htmlFor="email" error={fe.email}><Input id="email" type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Reset code" htmlFor="otp" error={fe.otp}><Input id="otp" inputMode="numeric" maxLength={6} value={f.otp} onChange={(e) => setF({ ...f, otp: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="New password" htmlFor="np" error={fe.new_password} hint="At least 8 characters with a letter and a number."><Input id="np" type="password" autoComplete="new-password" value={f.new_password} onChange={set('new_password')} /></Field>
        <Field label="Confirm new password" htmlFor="cp" error={fe.confirm_password}><Input id="cp" type="password" autoComplete="new-password" value={f.confirm_password} onChange={set('confirm_password')} /></Field>
        <Button type="submit" loading={busy} className="w-full">Update password</Button>
      </form>
      <p className="mt-6 text-sm"><Link to="/forgot-password" className="text-brand hover:underline">Request a new code</Link></p>
    </div>
  )
}
