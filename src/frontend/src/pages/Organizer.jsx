import { useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, PageHeader, StatCard } from '../ui'

export default function Organizer() {
  const [events, setEvents] = useState([])
  const [results, setResults] = useState([])
  const [progress, setProgress] = useState([])
  const [audit, setAudit] = useState([])
  const [judges, setJudges] = useState([])
  const [tick, setTick] = useState(0)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [close, setClose] = useState('')
  const [tracks, setTracks] = useState('')
  const [rubric, setRubric] = useState({ functionality: 1, quality: 1, innovation: 1 })

  const [judgeEmail, setJudgeEmail] = useState('')
  const [judgeEventId, setJudgeEventId] = useState('')
  const [judgeTracks, setJudgeTracks] = useState([])

  useEffect(() => {
    Promise.all([
      api('/api/events'),
      api('/api/organizer/results'),
      api('/api/organizer/progress'),
      api('/api/organizer/audit'),
    ])
      .then(([e, r, p, a]) => { setEvents(e); setResults(r); setProgress(p); setAudit(a) })
      .catch(err => setError(err.message))
  }, [tick])

  useEffect(() => {
    if (!judgeEventId) return
    api(`/api/events/${judgeEventId}/judges`)
      .then(setJudges)
      .catch(() => setJudges([]))
  }, [judgeEventId, tick])

  async function act(fn, okMsg) {
    setError('')
    setMsg('')
    try {
      await fn()
      setMsg(okMsg)
      setTick(t => t + 1)
    } catch (err) {
      setError(err.message)
    }
  }

  function createEvent(e) {
    e.preventDefault()
    act(() => api('/api/events', {
      method: 'POST',
      body: {
        name,
        submissions_close: new Date(close).toISOString(),
        tracks: tracks.split(',').map(t => t.trim()).filter(Boolean),
        rubric,
      },
    }), 'Event created')
  }

  function addJudge(e) {
    e.preventDefault()
    act(() => api(`/api/events/${judgeEventId}/judges`, {
      method: 'POST',
      body: { email: judgeEmail, tracks: judgeTracks },
    }), 'Judge added')
  }

  const selectedEvent = events.find(ev => ev.id === judgeEventId)

  function toggleTrack(id) {
    setJudgeTracks(list => list.includes(id) ? list.filter(t => t !== id) : [...list, id])
  }

  const coveredCount = progress.filter(p => p.review_count >= 3).length
  const lowestCoverage = progress.slice().sort((a, b) => a.review_count - b.review_count).slice(0, 3)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <PageHeader title="Organizer Dashboard" description="Manage events, judges, and results for DOGFOOD 2026." />

      <div className="space-y-3 mb-6">
        <Alert type="success">{msg}</Alert>
        <Alert type="error">{error}</Alert>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Events" value={events.length} />
        <StatCard label="Submissions" value={results.length} />
        <StatCard label="Judging coverage" value={`${coveredCount}/${progress.length}`} hint="Projects with 3+ reviews" />
        <StatCard label="Audit entries" value={audit.length} />
      </div>

      <section className="card card-pad mb-6">
        <h2 className="font-semibold text-ink mb-4">Create an event</h2>
        <form onSubmit={createEvent} className="space-y-4">
          <div>
            <label className="field-label">Event name</label>
            <input className="input" placeholder="Event name" value={name}
                   onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Submissions close</label>
            <input className="input" type="datetime-local" value={close}
                   onChange={e => setClose(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Tracks</label>
            <input className="input" placeholder="Comma separated (Web, AI, Mobile)"
                   value={tracks} onChange={e => setTracks(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Rubric weights</label>
            <div className="flex gap-3 flex-wrap">
              {Object.keys(rubric).map(k => (
                <label key={k} className="text-sm text-ink-soft flex items-center gap-2">
                  <span className="capitalize">{k}</span>
                  <input className="input w-20" type="number" step="0.1" min="0"
                         value={rubric[k]}
                         onChange={e => setRubric({ ...rubric, [k]: e.target.value })} />
                </label>
              ))}
            </div>
          </div>
          <button className="btn-primary">Create event</button>
        </form>
      </section>

      <section className="card card-pad mb-6">
        <h2 className="font-semibold text-ink mb-3">Events</h2>
        {events.length === 0 && (
          <p className="text-sm text-slate-500">No events yet.</p>
        )}
        <div className="divide-y divide-line">
          {events.map(ev => (
            <div key={ev.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 font-medium text-ink">
                {ev.name}
                {ev.published && <span className="badge-submitted">Published</span>}
              </div>
              <div className="text-sm text-slate-500 mt-1">
                Closes {new Date(ev.submissions_close).toLocaleString()} · Tracks:{' '}
                {ev.tracks.map(t => t.name).join(', ') || 'none'} · Rubric:{' '}
                {ev.rubric.map(r => `${r.name} x${r.weight}`).join(', ')}
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary btn-sm"
                  onClick={() => act(() => api(`/api/events/${ev.id}/assignments`, { method: 'POST', body: { target_reviews: 3 } }), 'Judges assigned')}>
                  Assign judges
                </button>
                <button className="btn-primary btn-sm"
                  onClick={() => act(() => api(`/api/events/${ev.id}/publish`, { method: 'POST' }), 'Results published')}>
                  Publish results
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card card-pad mb-6">
        <h2 className="font-semibold text-ink mb-1">Add a judge</h2>
        <p className="text-sm text-slate-500 mb-4">The person must have signed up first.</p>
        <form onSubmit={addJudge} className="space-y-4">
          <div>
            <label className="field-label">Judge's email</label>
            <input className="input" type="email" placeholder="judge@example.com"
                   value={judgeEmail} onChange={e => setJudgeEmail(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Event</label>
            <select className="input" value={judgeEventId}
                    onChange={e => { setJudgeEventId(e.target.value); setJudgeTracks([]) }} required>
              <option value="">Choose event</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          {selectedEvent && (
            <div className="flex gap-4 flex-wrap text-sm text-ink-soft">
              {selectedEvent.tracks.map(t => (
                <label key={t.id} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={judgeTracks.includes(t.id)}
                         onChange={() => toggleTrack(t.id)} /> {t.name}
                </label>
              ))}
            </div>
          )}
          <button className="btn-primary">Add judge</button>
        </form>

        {judgeEventId && (
          <div className="mt-5 pt-5 border-t border-line">
            <h3 className="font-medium text-sm text-ink mb-2">
              Judges on this event ({judges.length})
            </h3>
            <ul className="text-sm space-y-1.5 max-h-48 overflow-auto">
              {judges.map(j => (
                <li key={j.email} className="text-ink-soft">
                  <span className="text-ink">{j.name}</span> · {j.email} · <b>{j.role}</b> · added by{' '}
                  {j.added_by || 'fixture import'}
                  {j.tracks.length > 0 && ` · ${j.tracks.join(', ')}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card card-pad mb-6">
        <div className="flex items-center mb-4">
          <h2 className="font-semibold text-ink">Results (normalized)</h2>
          <a className="ml-auto link text-sm" href="/api/export.csv">Download CSV</a>
        </div>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th>#</th><th>Project</th><th>Normalized</th><th>Raw avg</th><th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.project_id}>
                  <td>{i + 1}</td>
                  <td className="text-ink font-medium">{r.title}</td>
                  <td>{r.normalized_score}</td>
                  <td>{r.raw_average}</td>
                  <td>{r.review_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && (
            <p className="text-sm text-slate-500 py-4">No results yet.</p>
          )}
        </div>
      </section>

      <section className="card card-pad mb-6">
        <h2 className="font-semibold text-ink mb-3">Judging progress</h2>
        <p className="text-sm text-slate-600">
          {coveredCount} of {progress.length} projects have 3+ reviews.
          {lowestCoverage.length > 0 && (
            <> Lowest coverage: {lowestCoverage.map(p => `${p.title} (${p.review_count})`).join(', ')}</>
          )}
        </p>
      </section>

      <section className="card card-pad">
        <h2 className="font-semibold text-ink mb-3">Audit log (latest 10)</h2>
        <ul className="text-sm space-y-2">
          {audit.slice(0, 10).map((a, i) => (
            <li key={i} className="text-slate-600">
              <span className="text-slate-400">{new Date(a.time + 'Z').toLocaleString()}</span> ·{' '}
              <b className="text-ink">{a.action}</b> · {a.target} {a.details || ''}
            </li>
          ))}
          {audit.length === 0 && <li className="text-slate-500">Nothing logged yet.</li>}
        </ul>
      </section>
    </div>
  )
}