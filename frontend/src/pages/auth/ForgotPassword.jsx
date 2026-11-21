import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Field, Input } from '../../components/ui'
import api, { errMsg } from '../../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await api.post('/auth/forgot-password/', { email }); nav('/reset-password', { state: { email: email.toLowerCase() } }) }
    catch (ex) { setErr(errMsg(ex)) } finally { setBusy(false) }
  }
  return (
    <div>
      <h1 className="text-3xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-muted">Enter your email and we will send a reset code if the account exists.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{err}</p>}
        <Field label="Email" htmlFor="email"><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Button type="submit" loading={busy} className="w-full">Send reset code</Button>
      </form>
      <p className="mt-6 text-sm"><Link to="/login" className="text-brand hover:underline">Back to sign in</Link></p>
    </div>
  )
}
