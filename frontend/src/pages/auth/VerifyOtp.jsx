import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Field, Input } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errMsg } from '../../services/api'

export default function VerifyOtp() {
  const { state } = useLocation()
  const nav = useNavigate()
  const { startSession } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState(state?.email || '')
  const [devOtp, setDevOtp] = useState(state?.dev_otp || '')
  const [otp, setOtp] = useState(state?.dev_otp || '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [cool, setCool] = useState(state?.resend ? 0 : 60)
  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(t) }, [cool])

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const { data } = await api.post('/auth/verify-otp/', { email: email.trim().toLowerCase(), otp })
      startSession(data); toast.success('Email verified. Welcome to OLIVE.'); nav('/dashboard', { replace: true })
    } catch (ex) { setErr(errMsg(ex)) } finally { setBusy(false) }
  }
  const resend = async () => {
    if (!email) return setErr('Please provide your email address.')
    try {
      const { data } = await api.post('/auth/resend-otp/', { email: email.trim().toLowerCase(), purpose: 'register' })
      toast.success('A new code is on its way.')
      setCool(60)
      if (data?.dev_otp) {
        setDevOtp(data.dev_otp)
        setOtp(data.dev_otp)
      }
    }
    catch (ex) { toast.error(errMsg(ex)) }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Check your email</h1>
      <p className="mt-2 text-muted">
        {email ? (
          <>Enter the 6-digit code sent to <strong className="text-ink">{email}</strong>. It expires in 10 minutes.</>
        ) : (
          <>Enter your email and the 6-digit code to verify your account.</>
        )}
      </p>

      {devOtp && (
        <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-50/80 p-3.5 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          <p className="font-semibold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">Development Mode</p>
          <div className="mt-1 flex items-center justify-between">
            <span>Verification code: <strong className="font-mono text-base tracking-widest">{devOtp}</strong></span>
            <button
              type="button"
              onClick={() => setOtp(devOtp)}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Fill Code
            </button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{err}</p>}
        {!state?.email && (
          <Field label="Email address" htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
          </Field>
        )}
        <Field label="Verification code" htmlFor="otp">
          <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="text-center text-2xl tracking-[0.5em]" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Button type="submit" loading={busy} disabled={otp.length !== 6 || !email} className="w-full">Verify email</Button>
      </form>
      <div className="mt-6 text-sm text-muted">
        <button onClick={resend} disabled={cool > 0 || !email} className="text-brand hover:underline disabled:text-muted disabled:no-underline">{cool > 0 ? `Resend code in ${cool}s` : 'Resend code'}</button>
        <span className="mx-2">|</span><Link to="/register" className="text-brand hover:underline">Use a different email</Link>
      </div>
    </div>
  )
}
