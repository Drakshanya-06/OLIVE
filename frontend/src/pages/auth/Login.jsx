import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, UserCheck, ArrowLeft, KeyRound } from 'lucide-react'
import { Button, Field, Input } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api, { errCode, errMsg, errDetails } from '../../services/api'

export default function Login({ admin = false }) {
  const { login } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const loc = useLocation()
  const [step, setStep] = useState('credentials') // 'credentials' | 'otp'
  const [f, setF] = useState({ email: '', password: '' })
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [err, setErr] = useState('')
  const [fieldErr, setFieldErr] = useState({})
  const [busy, setBusy] = useState(false)
  const [cool, setCool] = useState(60)

  useEffect(() => {
    if (step !== 'otp' || cool <= 0) return
    const t = setTimeout(() => setCool(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, cool])

  const submitCredentials = async (e) => {
    e.preventDefault(); setErr(''); setFieldErr({}); setBusy(true)
    try {
      const res = await login(f.email.trim().toLowerCase(), f.password, admin)
      if (admin && res?.require_otp) {
        setStep('otp')
        if (res.dev_otp) {
          setDevOtp(res.dev_otp)
          setOtp(res.dev_otp)
        }
        setCool(60)
        toast.success('Admin OTP code generated.')
        return
      }
      nav(admin ? '/admin/dashboard' : loc.state?.from || '/dashboard', { replace: true })
    } catch (ex) {
      if (errCode(ex) === 'email_not_verified') return nav('/verify-otp', { state: { email: f.email, resend: true } })
      setErr(errMsg(ex)); setFieldErr(errDetails(ex))
    } finally { setBusy(false) }
  }

  const submitOtp = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      await login(f.email.trim().toLowerCase(), f.password, true, otp)
      toast.success('Admin verified successfully.')
      nav('/admin/dashboard', { replace: true })
    } catch (ex) {
      setErr(errMsg(ex))
    } finally { setBusy(false) }
  }

  const resendAdminOtp = async () => {
    setErr('')
    try {
      const { data } = await api.post('/auth/resend-otp/', { email: f.email.trim().toLowerCase(), purpose: 'admin_login' })
      toast.success('A new admin code is on its way.')
      setCool(60)
      if (data?.dev_otp) {
        setDevOtp(data.dev_otp)
        setOtp(data.dev_otp)
      }
    } catch (ex) {
      toast.error(errMsg(ex))
    }
  }

  return (
    <div>
      {/* 2-Portal Switcher Tabs */}
      <div className="mb-6 flex rounded-xl border border-line bg-surface p-1 text-sm font-medium shadow-sm">
        <Link
          to="/login"
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-center transition-all ${
            !admin
              ? 'bg-gradient-to-r from-olive-900 to-teal-700 text-white shadow-sm'
              : 'text-muted hover:text-ink hover:bg-soft'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          User Portal
        </Link>
        <Link
          to="/admin/login"
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-center transition-all ${
            admin
              ? 'bg-gradient-to-r from-olive-900 to-teal-700 text-white shadow-sm'
              : 'text-muted hover:text-ink hover:bg-soft'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Admin Portal
        </Link>
      </div>

      {step === 'otp' ? (
        <div>
          <div className="flex items-center gap-2 text-brand">
            <KeyRound className="h-6 w-6 text-teal-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600">2-Step Verification</span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold">Enter Admin OTP</h1>
          <p className="mt-2 text-muted">
            Enter the 6-digit code sent to <strong className="text-ink">{f.email}</strong> to access the Admin Portal.
          </p>

          {devOtp && (
            <div className="mt-4 rounded-xl border border-teal-500/30 bg-teal-50/80 p-3.5 text-sm text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
              <p className="font-semibold text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400">Development Mode</p>
              <div className="mt-1 flex items-center justify-between">
                <span>Admin Login OTP: <strong className="font-mono text-base tracking-widest">{devOtp}</strong></span>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  className="rounded bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700 shadow-sm"
                >
                  Fill Code
                </button>
              </div>
            </div>
          )}

          <form onSubmit={submitOtp} className="mt-6 space-y-4">
            {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{err}</p>}
            <Field label="Admin Verification Code" htmlFor="admin-otp">
              <Input
                id="admin-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </Field>
            <Button type="submit" loading={busy} disabled={otp.length !== 6} className="w-full">
              Verify & Enter Admin Portal
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm text-muted">
            <button
              type="button"
              onClick={resendAdminOtp}
              disabled={cool > 0}
              className="text-brand hover:underline disabled:text-muted disabled:no-underline"
            >
              {cool > 0 ? `Resend OTP in ${cool}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('credentials'); setErr(''); }}
              className="inline-flex items-center gap-1 text-brand hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-semibold">{admin ? 'Admin sign in' : 'User sign in'}</h1>
          <p className="mt-2 text-muted">
            {admin
              ? 'Authorized personnel only. Requires 2-Step OTP authentication.'
              : 'Sign in to track your e-waste requests, analyze devices, and earn rewards.'}
          </p>
          <form onSubmit={submitCredentials} className="mt-8 space-y-4" noValidate>
            {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{err}</p>}
            <Field label="Email" htmlFor="email" error={fieldErr.email}>
              <Input id="email" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </Field>
            <Field label="Password" htmlFor="password" error={fieldErr.password}>
              <Input id="password" type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            </Field>
            <Button type="submit" loading={busy} className="w-full">
              {admin ? 'Continue to 2-Step OTP' : 'Sign in'}
            </Button>
          </form>
          {!admin ? (
            <div className="mt-6 flex justify-between text-sm">
              <Link to="/forgot-password" className="text-brand hover:underline">Forgot password?</Link>
              <Link to="/register" className="text-brand hover:underline font-medium">New user? Create an account</Link>
            </div>
          ) : (
            <div className="mt-6 text-center text-sm text-muted">
              <span>Standard user? </span>
              <Link to="/login" className="text-brand hover:underline font-medium">Switch to User Portal</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
