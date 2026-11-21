import { useEffect } from 'react'
import { Loader2, X, ChevronLeft, ChevronRight, AlertTriangle, Inbox } from 'lucide-react'

export const cx = (...c) => c.filter(Boolean).join(' ')

export function Button({ variant = 'primary', loading, className, children, ...p }) {
  return (
    <button className={cx('btn', `btn-${variant}`, className)} disabled={loading || p.disabled} {...p}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

export const Card = ({ className, children, ...p }) => <div className={cx('card', className)} {...p}>{children}</div>

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div>
      {label && <label className="label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-danger" role="alert">{error}</p>}
    </div>
  )
}
export const Input = ({ className, ...p }) => <input className={cx('input', className)} {...p} />
export const Textarea = ({ className, ...p }) => <textarea className={cx('input min-h-[96px]', className)} {...p} />
export const Select = ({ className, children, ...p }) => <select className={cx('input', className)} {...p}>{children}</select>

const TONES = {
  neutral: 'bg-soft text-ink', ok: 'bg-ok/15 text-ok', warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger', info: 'bg-brand-strong/15 text-brand', sample: 'bg-warn/15 text-warn',
}
export const Badge = ({ tone = 'neutral', children, className }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', TONES[tone], className)}>{children}</span>
)

export const Spinner = ({ className }) => <Loader2 className={cx('h-5 w-5 animate-spin text-brand', className)} />
export const PageLoader = ({ text = 'Loading...' }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted"><Spinner className="h-8 w-8" /><p className="text-sm">{text}</p></div>
)

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-soft text-brand"><Icon className="h-7 w-7" /></span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-danger" />
      <p className="text-sm">{message}</p>
      {onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[900] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-b-xl2 sm:p-6', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-soft hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        {Icon && <span className="grid h-10 w-10 place-items-center rounded-xl bg-soft text-brand"><Icon className="h-5 w-5" /></span>}
        <p className="text-sm text-muted">{label}</p>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  )
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <div className="mt-5 flex items-center justify-center gap-3 text-sm">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
      <span className="text-muted">Page {page} of {totalPages}</span>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
    </div>
  )
}

export function PageHeader({ title, text, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {text && <p className="mt-2 text-muted">{text}</p>}
      </div>
      {children}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cx('rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all', value === t.value ? 'bg-gradient-to-r from-olive-900 to-teal-700 text-white shadow-sm dark:from-teal-600 dark:to-olive-700' : 'text-muted hover:text-ink hover:bg-soft')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export const ProgressBar = ({ value, max = 100, className }) => (
  <div className={cx('h-2 overflow-hidden rounded-full bg-soft', className)} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
    <div className="h-full rounded-full bg-brand-strong" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
  </div>
)

export function Table({ columns, rows, empty }) {
  if (!rows?.length) return empty || null
  return (
    <div className="overflow-x-auto rounded-xl2 border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="bg-soft text-muted"><tr>{columns.map((c) => <th key={c.key} className="whitespace-nowrap px-4 py-3 font-semibold">{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} className="border-t border-line">
              {columns.map((c) => <td key={c.key} className="px-4 py-3 align-middle">{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
