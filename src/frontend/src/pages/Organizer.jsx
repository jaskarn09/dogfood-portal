import { useEffect, useState } from 'react'
import { api } from '../api'

const box = 'border rounded-lg p-4 mb-6'
const input = 'border rounded px-3 py-2'
const btn = 'bg-slate-900 text-white rounded px-3 py-2 text-sm'

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Organizer Dashboard</h1>
      {msg && <p className="text-green-700 mb-3">{msg}</p>}
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <section className={box}>
        <h2 className="font-semibold mb-3">Create an event</h2>
        <form onSubmit={createEvent} className="space-y-3">
          <input className={input + ' w-full'} placeholder="Event name" value={name}
                 onChange={e => setName(e.target.value)} required />
          <label className="block text-sm">Submissions close
            <input className={input + ' w-full mt-1'} type="datetime-local" value={close}
                   onChange={e => setClose(e.target.value)} required />
          </label>
          <input className={input + ' w-full'} placeholder="Tracks, comma separated (Web, AI, Mobile)"
                 value={tracks} onChange={e => setTracks(e.target.value)} />
          <div className="flex gap-3 flex-wrap">
            {Object.keys(rubric).map(k => (
              <label key={k} className="text-sm">{k} weight
                <input className={input + ' w-24 ml-2'} type="number" step="0.1" min="0"
                       value={rubric[k]}
                       onChange={e => setRubric({ ...rubric, [k]: e.target.value })} />
              </label>
            ))}
          </div>
          <button className={btn}>Create event</button>
        </form>
      </section>

      <section className={box}>
        <h2 className="font-semibold mb-3">Events</h2>
        {events.map(ev => (
          <div key={ev.id} className="border-b last:border-0 py-3">
            <div className="font-medium">{ev.name} {ev.published && <span className="text-green-700 text-sm">(published)</span>}</div>
            <div className="text-sm text-slate-600">
              Closes {new Date(ev.submissions_close).toLocaleString()} ·
              Tracks: {ev.tracks.map(t => t.name).join(', ') || 'none'} ·
              Rubric: {ev.rubric.map(r => `${r.name} x${r.weight}`).join(', ')}
            </div>
            <div className="mt-2 flex gap-2">
              <button className={btn}
                onClick={() => act(() => api(`/api/events/${ev.id}/assignments`, { method: 'POST', body: { target_reviews: 3 } }), 'Judges assigned')}>
                Assign judges
              </button>
              <button className={btn}
                onClick={() => act(() => api(`/api/events/${ev.id}/publish`, { method: 'POST' }), 'Results published')}>
                Publish results
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className={box}>
        <h2 className="font-semibold mb-3">Add a judge</h2>
        <p className="text-sm text-slate-600 mb-2">The person must have signed up first.</p>
        <form onSubmit={addJudge} className="space-y-3">
          <input className={input + ' w-full'} type="email" placeholder="Judge's email"
                 value={judgeEmail} onChange={e => setJudgeEmail(e.target.value)} required />
          <select className={input + ' w-full'} value={judgeEventId}
                  onChange={e => { setJudgeEventId(e.target.value); setJudgeTracks([]) }} required>
            <option value="">Choose event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          {selectedEvent && (
            <div className="flex gap-3 flex-wrap text-sm">
              {selectedEvent.tracks.map(t => (
                <label key={t.id}>
                  <input type="checkbox" checked={judgeTracks.includes(t.id)}
                         onChange={() => toggleTrack(t.id)} /> {t.name}
                </label>
              ))}
            </div>
          )}
          <button className={btn}>Add judge</button>
        </form>

        {judgeEventId && (
          <div className="mt-4">
            <h3 className="font-medium text-sm mb-1">Judges on this event ({judges.length})</h3>
            <ul className="text-sm space-y-1 max-h-48 overflow-auto">
              {judges.map(j => (
                <li key={j.email}>
                  {j.name} · {j.email} · <b>{j.role}</b> · added by {j.added_by || 'fixture import'}
                  {j.tracks.length > 0 && ` · ${j.tracks.join(', ')}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={box}>
        <div className="flex items-center mb-3">
          <h2 className="font-semibold">Results (normalized)</h2>
          <a className="ml-auto text-sm text-blue-700 underline" href="/api/export.csv">Download CSV</a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1">#</th><th>Project</th><th>Normalized</th><th>Raw avg</th><th>Reviews</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r.project_id} className="border-b last:border-0">
                <td className="py-1">{i + 1}</td>
                <td>{r.title}</td>
                <td>{r.normalized_score}</td>
                <td>{r.raw_average}</td>
                <td>{r.review_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={box}>
        <h2 className="font-semibold mb-3">Judging progress</h2>
        <p className="text-sm text-slate-600">
          {progress.filter(p => p.review_count >= 3).length} of {progress.length} projects have 3+ reviews.
          Lowest coverage: {progress.slice().sort((a, b) => a.review_count - b.review_count).slice(0, 3)
            .map(p => `${p.title} (${p.review_count})`).join(', ')}
        </p>
      </section>

      <section className={box}>
        <h2 className="font-semibold mb-3">Audit log (latest 10)</h2>
        <ul className="text-sm space-y-1">
          {audit.slice(0, 10).map((a, i) => (
            <li key={i}>
              {new Date(a.time + 'Z').toLocaleString()} · <b>{a.action}</b> · {a.target} {a.details || ''}
            </li>
          ))}
          {audit.length === 0 && <li className="text-slate-500">Nothing logged yet.</li>}
        </ul>
      </section>
    </div>
  )
}