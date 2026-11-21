import { Link } from 'react-router-dom'

/** Original OLIVE mark with Olive & Electric Teal palette */
export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="oliveTealBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2D4A22" />
          <stop offset="100%" stopColor="#134E4A" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#oliveTealBg)" />
      <path d="M32 17c9 2 14 9 12.5 18-1 7-7 12-13.500 12-5 0-8.500-3.500-8.500-8.500C22.500 29 26 21 32 17z" fill="#F0F8F5" />
      <path d="M31.500 23c-2.500 8-2.500 15 1 22" stroke="#2D4A22" strokeWidth="2.200" fill="none" strokeLinecap="round" />
      <path d="M12 30a21 21 0 0 1 33-14" stroke="#14B8A6" strokeWidth="3.200" fill="none" strokeLinecap="round" />
      <path d="M46 10.500l-1 8.500-8-3z" fill="#14B8A6" />
      <path d="M52 34a21 21 0 0 1-33 14" stroke="#14B8A6" strokeWidth="3.200" fill="none" strokeLinecap="round" />
      <path d="M18 53.500l1-8.500 8 3z" fill="#14B8A6" />
    </svg>
  )
}

export default function Logo({ to = '/', admin = false, light = false }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="OLIVE home">
      <LogoMark />
      <span className="leading-none">
        <span className={`block font-display text-xl font-semibold ${light ? 'text-white' : 'text-brand'}`}>
          OLIVE<span className="text-teal-500 font-bold">.</span>
        </span>
        <span className={`block text-[11px] ${light ? 'text-white/70' : 'text-muted'}`}>{admin ? 'Admin portal' : 'Recycle smart'}</span>
      </span>
    </Link>
  )
}
