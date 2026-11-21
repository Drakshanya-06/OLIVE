import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle2, XCircle, Flag, Users, GraduationCap } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, PageLoader, Pagination, ProgressBar, Select, Spinner, Tabs } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api, { errMsg } from '../services/api'
import useFetch from '../hooks/useFetch'
import { cap, fmtDate, fmtDateTime } from '../utils/format'

function ArticleModal({ slug, onClose }) {
  const { user } = useAuth()
  const { data, loading, error } = useFetch(`/learning/articles/${slug}/`)
  const [marked, setMarked] = useState(false)
  const mark = async () => { try { await api.post(`/learning/articles/${slug}/read/`); setMarked(true) } catch { /* ignore */ } }
  return (
    <Modal open onClose={onClose} title={data?.title || 'Article'} wide>
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : (
        <div className="prose-olive text-sm">
          {data.content.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          {user ? <Button variant="secondary" disabled={marked} onClick={mark}><CheckCircle2 className="h-4 w-4" />{marked ? 'Marked as read' : 'Mark as read'}</Button> : <p className="text-muted"><Link className="text-brand hover:underline" to="/login">Sign in</Link> to track your reading progress.</p>}
        </div>)}
    </Modal>
  )
}

function QuizModal({ quizId, onClose }) {
  const { user } = useAuth()
  const toast = useToast()
  const { data: quiz, loading } = useFetch(`/learning/quizzes/${quizId}/`)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try { const { data } = await api.post(`/learning/quizzes/${quizId}/submit/`, { answers: quiz.questions.map((_, i) => answers[i]) }); setResult(data) }
    catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={quiz?.title || 'Quiz'} wide>
      {loading ? <Spinner /> : !user ? <EmptyState icon={GraduationCap} title="Sign in to take quizzes" text="Your scores and badges are saved to your account." action={<Link to="/login" className="btn btn-primary">Sign in</Link>} /> : result ? (
        <div>
          <div className="rounded-xl bg-soft p-5 text-center"><p className="font-display text-4xl font-semibold">{result.percent}%</p><p className="mt-1 text-sm">{result.score} of {result.total} correct - {result.passed ? 'Passed' : 'Not passed yet. Try again.'}</p></div>
          <ol className="mt-5 space-y-3 text-sm">{quiz.questions.map((q, i) => (
            <li key={i} className="rounded-xl border border-line p-3"><p className="flex items-start gap-2 font-medium">{result.review[i].correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}{q.question}</p>
              {!result.review[i].correct && <p className="mt-1 text-muted">Correct answer: {q.options[result.review[i].correct_index]}</p>}{result.review[i].explanation && <p className="mt-1 text-muted">{result.review[i].explanation}</p>}</li>))}</ol>
          <Button className="mt-5" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {quiz.questions.map((q, i) => (
            <fieldset key={i}><legend className="font-medium">{i + 1}. {q.question}</legend>
              <div className="mt-2 grid gap-2">{q.options.map((o, oi) => <label key={oi} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${answers[i] === oi ? 'border-brand-strong bg-soft' : 'border-line'}`}><input type="radio" name={`q${i}`} className="accent-teal-600" checked={answers[i] === oi} onChange={() => setAnswers({ ...answers, [i]: oi })} />{o}</label>)}</div></fieldset>))}
          <Button loading={busy} disabled={Object.keys(answers).length < quiz.questions.length} onClick={submit}>Submit answers</Button>
        </div>)}
    </Modal>
  )
}

export default function Learning() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('articles')
  const [cat, setCat] = useState('')
  const [page, setPage] = useState(1)
  const [article, setArticle] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const arts = useFetch('/learning/articles/', { params: { page, category: cat || undefined } })
  const quizzes = useFetch('/learning/quizzes/')
  const ch = useFetch('/learning/challenges/', { enabled: !!user })
  const prog = useFetch('/learning/progress/', { enabled: !!user })
  const att = useFetch('/learning/attempts/', { enabled: !!user })
  const ach = useFetch('/rewards/achievements/', { enabled: !!user })

  const join = async (c) => { try { await api.post(`/learning/challenges/${c.id}/join/`); toast.success('Challenge joined.'); ch.reload() } catch (e) { toast.error(errMsg(e)) } }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Learn and take on challenges" text="Short articles, quizzes and monthly challenges that build your recycling know-how." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'articles', label: 'Articles' }, { value: 'quizzes', label: 'Quizzes' }, { value: 'challenges', label: 'Monthly challenges' }, { value: 'progress', label: 'My progress' }]} />
      <div className="mt-6">
        {tab === 'articles' && (<>
          <Select aria-label="Category" className="mb-4 !w-auto" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1) }}><option value="">All topics</option>{['awareness', 'hazards', 'recycling', 'tutorial', 'policy'].map((c) => <option key={c} value={c}>{cap(c)}</option>)}</Select>
          {arts.loading ? <PageLoader /> : arts.error ? <ErrorState message={arts.error} onRetry={arts.reload} /> : !arts.data.results.length ? <EmptyState icon={BookOpen} title="No articles yet" text="New articles will appear here." /> : (<>
            <div className="grid gap-4 md:grid-cols-3">{arts.data.results.map((a) => <button key={a.id} onClick={() => setArticle(a.slug)} className="card p-5 text-left transition-colors hover:border-brand-strong"><Badge>{cap(a.category)}</Badge><h3 className="mt-3 font-sans text-lg font-semibold">{a.title}</h3><p className="mt-1 text-sm text-muted">{a.summary}</p><p className="mt-3 text-xs text-muted">{a.read_minutes} min read</p></button>)}</div>
            <Pagination page={arts.data.page} totalPages={arts.data.total_pages} onChange={setPage} /></>)}
        </>)}
        {tab === 'quizzes' && (quizzes.loading ? <PageLoader /> : !quizzes.data?.results.length ? <EmptyState icon={GraduationCap} title="No quizzes yet" /> : (
          <div className="grid gap-4 md:grid-cols-2">{quizzes.data.results.map((q) => <Card key={q.id} className="p-5"><h3 className="font-sans text-lg font-semibold">{q.title}</h3><p className="mt-1 text-sm text-muted">{q.description}</p><p className="mt-3 text-xs text-muted">{q.question_count} questions - pass mark {q.pass_mark}%</p><Button className="mt-4" onClick={() => setQuiz(q.id)}>Start quiz</Button></Card>)}</div>))}
        {tab === 'challenges' && (!user ? <EmptyState icon={Flag} title="Sign in to join challenges" action={<Link to="/login" className="btn btn-primary">Sign in</Link>} /> : ch.loading ? <PageLoader /> : !ch.data?.results.length ? <EmptyState icon={Flag} title="No active challenges" text="New monthly challenges are added by administrators." /> : (
          <div className="grid gap-4 md:grid-cols-2">{ch.data.results.map((c) => <Card key={c.id} className="p-5"><div className="flex items-start justify-between gap-2"><h3 className="font-sans text-lg font-semibold">{c.title}</h3>{c.completed && <Badge tone="ok">Completed</Badge>}</div><p className="mt-1 text-sm text-muted">{c.description}</p><p className="mt-3 flex items-center gap-3 text-xs text-muted"><span>Ends {fmtDate(c.end_date)}</span><span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.participants}</span>{c.bonus_points > 0 && <span>+{c.bonus_points} bonus points</span>}</p>
            {c.joined ? <div className="mt-4"><ProgressBar value={c.progress} max={c.target} /><p className="mt-1 text-xs text-muted">{c.progress} of {c.target}</p></div> : <Button className="mt-4" onClick={() => join(c)}>Join challenge</Button>}</Card>)}</div>))}
        {tab === 'progress' && (!user ? <EmptyState icon={GraduationCap} title="Sign in to see your progress" action={<Link to="/login" className="btn btn-primary">Sign in</Link>} /> : prog.loading ? <PageLoader /> : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2"><Card className="p-5"><p className="text-sm text-muted">Articles read</p><p className="font-display text-3xl font-semibold">{prog.data.articles_read} / {prog.data.articles_total}</p><ProgressBar className="mt-3" value={prog.data.articles_read} max={prog.data.articles_total || 1} /></Card><Card className="p-5"><p className="text-sm text-muted">Quizzes passed</p><p className="font-display text-3xl font-semibold">{prog.data.quizzes_passed} / {prog.data.quizzes_total}</p><ProgressBar className="mt-3" value={prog.data.quizzes_passed} max={prog.data.quizzes_total || 1} /></Card></div>
            <div><h3 className="mb-3 font-sans text-lg font-semibold">Quiz scores</h3>{!att.data?.results.length ? <p className="text-sm text-muted">No attempts yet.</p> : <ul className="divide-y divide-line rounded-xl2 border border-line bg-surface text-sm">{att.data.results.map((a) => <li key={a.id} className="flex items-center justify-between px-4 py-3"><span>{a.quiz_title}<span className="block text-xs text-muted">{fmtDateTime(a.created_at)}</span></span><Badge tone={a.passed ? 'ok' : 'warn'}>{a.percent}%</Badge></li>)}</ul>}</div>
            <div><h3 className="mb-3 font-sans text-lg font-semibold">Awareness badges</h3><div className="flex flex-wrap gap-2">{(ach.data?.results || []).filter((a) => a.earned).map((a) => <Badge key={a.id} tone="ok">{a.title}</Badge>)}{!(ach.data?.results || []).some((a) => a.earned) && <p className="text-sm text-muted">Read articles and pass quizzes to unlock badges.</p>}</div></div>
          </div>))}
      </div>
      {article && <ArticleModal slug={article} onClose={() => setArticle(null)} />}
      {quiz && <QuizModal quizId={quiz} onClose={() => { setQuiz(null); att.reload(); prog.reload() }} />}
    </div>
  )
}
