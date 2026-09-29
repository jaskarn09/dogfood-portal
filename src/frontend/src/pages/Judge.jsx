import { useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, Badge, EmptyState, PageHeader } from '../ui'

export default function Judge() {
  const [assignments, setAssignments] = useState([])
  const [scores, setScores] = useState({})
  const [events, setEvents] = useState([])
  const [peers, setPeers] = useState([])
  const [open, setOpen] = useState(null)
  const [form, setForm] = useState({})
  const [comment, setComment] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    Promise.all([
      api('/api/judge/assignments'),
      api('/api/judge/scores'),
      api('/api/events'),
      api('/api/judge/peers'),
    ])
      .then(([a, s, e, p]) => {
        setAssignments(a)
        setScores(Object.fromEntries(s.map(x => [x.project_id, x])))
        setEvents(e)
        setPeers(p)
      })
      .catch(err => setError(err.message))
  }, [tick])

  const rubricFor = a => events.find(e => e.id === a.event_id)?.rubric ?? []

  function openForm(a) {
    const existing = scores[a.project_id]
    setForm(existing ? existing.criteria : {})
    setComment(existing?.comment ?? '')
    setOpen(a.project_id)
  }

  async function save(a) {
    setError('')
    setMsg('')
    try {
      const criteria = {}
      rubricFor(a).forEach(r => { criteria[r.name] = Number(form[r.name] ?? 3) })
      await api('/api/judge/scores', {
        method: 'POST',
        body: { project_id: a.project_id, criteria, comment },
      })
      setMsg(`Saved your score for ${a.title}`)
      setOpen(null)
      setTick(t => t + 1)
    } catch (err) {
      setError(err.message)
    }
  }

  const done = assignments.filter(a => a.scored).length
  const pct = assignments.length ? Math.round((done / assignments.length) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <PageHeader title="Judging" description="Score your assigned projects against the event rubric." />

      <div className="space-y-3 mb-6">
        <Alert type="success">{msg}</Alert>
        <Alert type="error">{error}</Alert>
      </div>

      <section className="card card-pad mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-ink">Your assignments</h2>
          <span className="text-sm text-slate-500">{done} / {assignments.length} completed</span>
        </div>

        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-1">
          <div
            className="h-full bg-brand-600 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      {assignments.length === 0 ? (
        <EmptyState
          title="No projects assigned yet"
          description="Ask the organizer to run Assign judges for your event."
        />
      ) : (
        <section className="card divide-y divide-line mb-8">
          {assignments.map(a => (
            <div key={a.project_id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-ink">{a.title}</span>
                <Badge tone={a.scored ? 'submitted' : 'draft'}>
                  {a.scored ? 'Scored' : 'To do'}
                </Badge>
                <button className="btn-secondary btn-sm ml-auto" onClick={() => openForm(a)}>
                  {a.scored ? 'Edit score' : 'Score'}
                </button>
              </div>

              {open === a.project_id && (
                <div className="mt-4 space-y-4 bg-slate-50 rounded-xl p-4">
                  {rubricFor(a).map(r => (
                    <label key={r.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink-soft">{r.name} <span className="text-slate-400">(x{r.weight})</span></span>
                      <select
                        className="input w-24"
                        value={form[r.name] ?? 3}
                        onChange={e => setForm({ ...form, [r.name]: e.target.value })}
                      >
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                  ))}
                  <textarea
                    className="input"
                    rows="2"
                    placeholder="Comment (optional)"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button className="btn-primary btn-sm" onClick={() => save(a)}>Save score</button>
                    <button className="text-sm text-slate-500 hover:text-ink" onClick={() => setOpen(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {peers.map(p => (
        <section key={p.event_id} className="card card-pad mb-6">
          <h2 className="font-semibold text-ink mb-1">Judging panel: {p.event_name}</h2>
          <p className="text-sm text-slate-500 mb-3">
            {p.you_were_added_by
              ? `You were added by ${p.you_were_added_by}.`
              : 'You were imported with the event data.'}
          </p>
          <ul className="text-sm space-y-1.5 max-h-48 overflow-auto">
            {p.judges.map((j, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-ink">{j.name}</span>
                {j.is_you && <Badge tone="info">You</Badge>}
                {j.tracks.length > 0 && (
                  <span className="text-slate-400">· {j.tracks.join(', ')}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 mt-3">
            You can see who else is judging, never their scores.
          </p>
        </section>
      ))}
    </div>
  )
}