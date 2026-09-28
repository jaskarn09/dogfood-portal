import { useEffect, useState } from 'react'
import { api } from '../api'

const btn = 'bg-slate-900 text-white rounded px-3 py-1 text-sm'

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Judging</h1>
      {msg && <p className="text-green-700 mb-3">{msg}</p>}
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <section className="border rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-1">Your projects</h2>
        <p className="text-sm text-slate-600 mb-3">{done} of {assignments.length} scored</p>
        {assignments.length === 0 && (
          <p className="text-sm text-slate-500">No projects assigned yet. Ask the organizer to run Assign judges.</p>
        )}
        {assignments.map(a => (
          <div key={a.project_id} className="border-b last:border-0 py-3">
            <div className="flex items-center gap-3">
              <span className="font-medium">{a.title}</span>
              <span className={a.scored ? 'text-green-700 text-sm' : 'text-slate-500 text-sm'}>
                {a.scored ? 'scored' : 'to do'}
              </span>
              <button className={btn + ' ml-auto'} onClick={() => openForm(a)}>
                {a.scored ? 'Edit score' : 'Score'}
              </button>
            </div>
            {open === a.project_id && (
              <div className="mt-3 space-y-3 bg-slate-50 rounded p-3">
                {rubricFor(a).map(r => (
                  <label key={r.name} className="flex items-center gap-3 text-sm">
                    <span className="w-32">{r.name} (x{r.weight})</span>
                    <select className="border rounded px-2 py-1" value={form[r.name] ?? 3}
                            onChange={e => setForm({ ...form, [r.name]: e.target.value })}>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                ))}
                <textarea className="border rounded px-3 py-2 w-full text-sm" rows="2"
                          placeholder="Comment (optional)" value={comment}
                          onChange={e => setComment(e.target.value)} />
                <div className="flex gap-2">
                  <button className={btn} onClick={() => save(a)}>Save score</button>
                  <button className="text-sm underline" onClick={() => setOpen(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {peers.map(p => (
        <section key={p.event_id} className="border rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-1">Judging panel: {p.event_name}</h2>
          <p className="text-sm text-slate-600 mb-3">
            {p.you_were_added_by
              ? `You were added by ${p.you_were_added_by}.`
              : 'You were imported with the event data.'}
          </p>
          <ul className="text-sm space-y-1 max-h-48 overflow-auto">
            {p.judges.map((j, i) => (
              <li key={i}>
                {j.name}{j.is_you && <b> (you)</b>}
                {j.tracks.length > 0 && <span className="text-slate-500"> · {j.tracks.join(', ')}</span>}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-2">You can see who else is judging, never their scores.</p>
        </section>
      ))}
    </div>
  )
}