export const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')
export const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-')
export const fmtNum = (n, d = 0) => (n === null || n === undefined ? '-' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: d }))
export const mgToText = (mg) => (mg >= 1000 ? `${fmtNum(mg / 1000, 2)} g` : `${fmtNum(mg, 1)} mg`)
export const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1)
export const label = (s = '') => cap(String(s).replaceAll('_', ' '))
export const STATUS_LABEL = { submitted: 'Submitted', under_review: 'Under review', approved: 'Approved', collected: 'Collected', verified: 'Verified', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled' }
export const STATUS_TONE = { submitted: 'neutral', under_review: 'warn', approved: 'info', collected: 'info', verified: 'ok', completed: 'ok', rejected: 'danger', cancelled: 'neutral' }
export const MATERIAL_COLORS = { gold: '#C9A227', silver: '#9AA5A0', copper: '#B87333', palladium: '#6B7B8C', aluminium: '#A3B18A', lithium: '#7E6BB0', cobalt: '#3B6EA5' }
export const matColor = (m) => MATERIAL_COLORS[m] || '#708238'
export const monthLabel = (k) => { const [y, m] = k.split('-'); return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short' }) }
export const todayISO = () => new Date().toISOString().slice(0, 10)
