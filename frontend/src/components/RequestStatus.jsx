import { Badge } from './ui'
import { STATUS_LABEL, STATUS_TONE, fmtDateTime } from '../utils/format'
import { Check } from 'lucide-react'

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status] || status}</Badge>

const STEPS = ['submitted', 'under_review', 'approved', 'collected', 'verified', 'completed']

/** Horizontal progress through the six official request statuses. */
export function StatusTimeline({ request }) {
  const reached = new Set((request.status_history || []).map((h) => h.status))
  const failed = ['rejected', 'cancelled'].includes(request.status)
  const stamp = Object.fromEntries((request.status_history || []).map((h) => [h.status, h.at]))
  return (
    <div>
      <ol className="grid grid-cols-3 gap-y-4 sm:grid-cols-6">
        {STEPS.map((s) => {
          const done = reached.has(s)
          return (
            <li key={s} className="flex flex-col items-center text-center">
              <span className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs ${done ? 'border-brand-strong bg-brand-strong text-white' : 'border-line text-muted'}`}>
                {done ? <Check className="h-4 w-4" /> : ''}
              </span>
              <span className="mt-1.5 text-xs font-medium">{STATUS_LABEL[s]}</span>
              <span className="text-[11px] text-muted">{done ? fmtDateTime(stamp[s]) : ''}</span>
            </li>
          )
        })}
      </ol>
      {failed && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">This request was {request.status}. {request.status_history?.slice(-1)[0]?.note}</p>}
    </div>
  )
}
