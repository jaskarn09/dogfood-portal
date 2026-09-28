import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Gallery() {
  const [projects, setProjects] = useState([])
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [track, setTrack] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/events').then(setEvents).catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (track) params.set('track', track)
    api('/api/projects?' + params.toString())
      .then(setProjects)
      .catch(e => setError(e.message))
  }, [search, track])

  const tracks = events.flatMap(e => e.tracks)
  const trackName = id => tracks.find(t => t.id === id)?.name

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Project Gallery</h1>
      <div className="flex gap-3 mb-4">
        <input className="border rounded px-3 py-2 flex-1" placeholder="Search projects..."
               value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border rounded px-3 py-2" value={track}
                onChange={e => setTrack(e.target.value)}>
          <option value="">All tracks</option>
          {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <p className="text-sm text-slate-500 mb-2">{projects.length} projects</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map(p => (
          <div key={p.id} className="border rounded-lg p-4 shadow-sm">
            <h2 className="font-semibold">{p.title}</h2>
            {trackName(p.track_id) && (
              <span className="text-xs bg-slate-200 rounded px-2 py-0.5">{trackName(p.track_id)}</span>
            )}
            <p className="text-sm text-slate-600 mt-2">{p.summary}</p>
            {p.repo_url && (
              <a className="text-sm text-blue-700 underline" href={p.repo_url}
                 target="_blank" rel="noreferrer">Repository</a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}