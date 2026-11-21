import { useState } from 'react'
import { Badge, PageHeader, Tabs } from '../../components/ui'
import ResourceManager from '../../components/admin/ResourceManager'
import { fmtDate, label } from '../../utils/format'

const CATS = ['smartphone', 'laptop', 'desktop', 'tablet', 'battery', 'charger', 'television', 'monitor', 'other']

export function AdminFacilities() {
  return (
    <div>
      <PageHeader title="Facilities" text="Add, edit, verify and remove collection points. Only mark a facility Verified when you can cite an official source." />
      <ResourceManager endpoint="/admin/facilities/" noun="Facility"
        defaults={{ facility_type: 'private', operating_status: 'operational', verification_status: 'pending', accepted_categories: [], is_active: true, is_sample: false }}
        filters={[{ key: 'verification_status', label: 'All verification', options: ['verified', 'pending', 'unverified', 'sample'] }, { key: 'facility_type', label: 'All types', options: ['government', 'private', 'ngo'] }]}
        columns={[{ key: 'name', label: 'Name', render: (r) => <span><strong>{r.name}</strong><span className="block text-xs text-muted">{r.city}, {r.state}</span></span> }, { key: 'facility_type', label: 'Type', render: (r) => label(r.facility_type) }, { key: 'verification_status', label: 'Verification', render: (r) => <Badge tone={r.verification_status === 'verified' ? 'ok' : r.verification_status === 'sample' ? 'sample' : 'neutral'}>{label(r.verification_status)}</Badge> }, { key: 'operating_status', label: 'Status', render: (r) => label(r.operating_status) }, { key: 'rating', label: 'Rating', render: (r) => (r.rating_count ? `${r.rating_avg} (${r.rating_count})` : '-') }]}
        fields={[
          { key: 'name', label: 'Name', required: true }, { key: 'facility_type', label: 'Type', type: 'select', required: true, options: ['government', 'private', 'ngo'] },
          { key: 'address', label: 'Address', required: true, full: true }, { key: 'city', label: 'City', required: true }, { key: 'state', label: 'State' }, { key: 'pincode', label: 'PIN code' },
          { key: 'latitude', label: 'Latitude', type: 'number', required: true, hint: 'Right-click the spot on openstreetmap.org and choose Show address.' }, { key: 'longitude', label: 'Longitude', type: 'number', required: true },
          { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'website', label: 'Website' }, { key: 'operating_hours', label: 'Operating hours', hint: 'e.g. Mon-Sat 10:00-17:00' },
          { key: 'operating_status', label: 'Operating status', type: 'select', required: true, options: ['operational', 'temporarily_closed', 'closed'] },
          { key: 'verification_status', label: 'Verification status', type: 'select', required: true, options: ['verified', 'pending', 'unverified', 'sample'] },
          { key: 'data_source', label: 'Data source', full: true, hint: 'Required for Verified, e.g. the official authorised-recycler list and its date.' },
          { key: 'accepted_categories', label: 'Accepted waste', type: 'multicheck', options: CATS }, { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
          { key: 'is_active', label: 'Visible to users', type: 'checkbox', checkLabel: 'Active' }, { key: 'is_sample', label: 'Sample record', type: 'checkbox', checkLabel: 'This is demonstration data' },
        ]} />
    </div>
  )
}

export function AdminDevices() {
  return (
    <div>
      <PageHeader title="Device reference data" text="Configure estimated material content per device. These feed the analyzer. Cite your data source and clear the placeholder flag only for figures you can back up." />
      <ResourceManager endpoint="/admin/device-reference/" noun="Reference"
        defaults={{ category: 'smartphone', is_category_default: false, is_placeholder: true, is_active: true, materials_mg: {} }}
        filters={[{ key: 'category', label: 'All categories', options: CATS }, { key: 'is_category_default', label: 'Any scope', options: [{ value: 'true', label: 'Category defaults' }, { value: 'false', label: 'Model-specific' }] }]}
        columns={[{ key: 'category', label: 'Category', render: (r) => label(r.category) }, { key: 'brand', label: 'Brand / model', render: (r) => (r.is_category_default ? <Badge>Category average</Badge> : `${r.brand} ${r.model}`) }, { key: 'weight_g', label: 'Weight (g)' }, { key: 'materials_mg', label: 'Materials (mg)', render: (r) => Object.entries(r.materials_mg || {}).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(', ') }, { key: 'is_placeholder', label: 'Data', render: (r) => <Badge tone={r.is_placeholder ? 'sample' : 'ok'}>{r.is_placeholder ? 'Placeholder' : 'Cited'}</Badge> }]}
        fields={[
          { key: 'category', label: 'Category', type: 'select', required: true, options: CATS }, { key: 'is_category_default', label: 'Scope', type: 'checkbox', checkLabel: 'Category average (no specific model)' },
          { key: 'brand', label: 'Brand', hint: 'Ignored for category averages.' }, { key: 'model', label: 'Model' },
          { key: 'weight_g', label: 'Typical weight (g)', type: 'number' }, { key: 'recovery_rate', label: 'Recovery rate (0-1)', type: 'number', hint: 'Leave empty to use the platform default.' },
          { key: 'materials_mg', label: 'Material content in milligrams per device', type: 'kv', placeholder: 'gold=30\nsilver=300\ncopper=12000', hint: 'One per line as name=milligrams.' },
          { key: 'data_source', label: 'Data source', required: true, full: true }, { key: 'is_placeholder', label: 'Placeholder flag', type: 'checkbox', checkLabel: 'Figures are placeholders, not cited' }, { key: 'is_active', label: 'Active', type: 'checkbox', checkLabel: 'Use in the analyzer' },
        ]} />
    </div>
  )
}

export function AdminLearning() {
  const [tab, setTab] = useState('articles')
  return (
    <div>
      <PageHeader title="Learning content" text="Create and edit articles, quizzes and monthly challenges."><Tabs value={tab} onChange={setTab} tabs={[{ value: 'articles', label: 'Articles' }, { value: 'quizzes', label: 'Quizzes' }, { value: 'challenges', label: 'Challenges' }]} /></PageHeader>
      {tab === 'articles' && <ResourceManager key="a" endpoint="/admin/articles/" noun="Article" defaults={{ category: 'awareness', published: true, read_minutes: 4 }}
        columns={[{ key: 'title', label: 'Title' }, { key: 'category', label: 'Category', render: (r) => label(r.category) }, { key: 'published', label: 'Status', render: (r) => <Badge tone={r.published ? 'ok' : 'neutral'}>{r.published ? 'Published' : 'Draft'}</Badge> }]}
        fields={[{ key: 'title', label: 'Title', required: true, full: true }, { key: 'category', label: 'Category', type: 'select', required: true, options: ['awareness', 'hazards', 'recycling', 'tutorial', 'policy'] }, { key: 'read_minutes', label: 'Read time (min)', type: 'number' }, { key: 'summary', label: 'Summary', required: true, full: true }, { key: 'content', label: 'Content', type: 'textarea', rows: 10, hint: 'Separate paragraphs with a blank line.' }, { key: 'published', label: 'Visibility', type: 'checkbox', checkLabel: 'Published' }]} />}
      {tab === 'quizzes' && <ResourceManager key="q" endpoint="/admin/quizzes/" noun="Quiz" defaults={{ published: true, pass_mark: 70, questions: [{ question: '', options: ['', ''], correct_index: 0, explanation: '' }] }} searchable
        columns={[{ key: 'title', label: 'Title' }, { key: 'q', label: 'Questions', render: (r) => r.questions?.length }, { key: 'pass_mark', label: 'Pass mark', render: (r) => `${r.pass_mark}%` }, { key: 'published', label: 'Status', render: (r) => <Badge tone={r.published ? 'ok' : 'neutral'}>{r.published ? 'Published' : 'Draft'}</Badge> }]}
        fields={[{ key: 'title', label: 'Title', required: true, full: true }, { key: 'description', label: 'Description', full: true }, { key: 'pass_mark', label: 'Pass mark (%)', type: 'number' }, { key: 'published', label: 'Visibility', type: 'checkbox', checkLabel: 'Published' }, { key: 'questions', label: 'Questions (select the radio button beside the correct option)', type: 'questions' }]} />}
      {tab === 'challenges' && <ResourceManager key="c" endpoint="/admin/challenges/" noun="Challenge" defaults={{ type: 'recycle_devices', target: 1, bonus_points: 0, active: true }}
        columns={[{ key: 'title', label: 'Title' }, { key: 'type', label: 'Goal', render: (r) => `${label(r.type)} x ${r.target}` }, { key: 'dates', label: 'Dates', render: (r) => `${fmtDate(r.start_date)} - ${fmtDate(r.end_date)}` }, { key: 'bonus_points', label: 'Bonus' }, { key: 'active', label: 'Status', render: (r) => <Badge tone={r.active ? 'ok' : 'neutral'}>{r.active ? 'Active' : 'Off'}</Badge> }]}
        fields={[{ key: 'title', label: 'Title', required: true, full: true }, { key: 'description', label: 'Description', full: true }, { key: 'type', label: 'Goal type', type: 'select', required: true, options: [{ value: 'recycle_devices', label: 'Recycle devices' }, { value: 'quiz_passed', label: 'Pass quizzes' }, { value: 'read_articles', label: 'Read articles' }] }, { key: 'target', label: 'Target count', type: 'number', required: true }, { key: 'start_date', label: 'Start date', type: 'date', required: true }, { key: 'end_date', label: 'End date', type: 'date', required: true }, { key: 'bonus_points', label: 'Bonus points on completion', type: 'number' }, { key: 'active', label: 'Status', type: 'checkbox', checkLabel: 'Active' }]} />}
    </div>
  )
}
