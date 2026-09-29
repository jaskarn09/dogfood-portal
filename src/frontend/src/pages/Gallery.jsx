import { useEffect, useState } from 'react'
import { Alert, EmptyState, LoadingState } from '../ui'

import { api } from '../api'

export default function Gallery() {
  const [projects, setProjects] = useState([])
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [track, setTrack] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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
      .finally(() => setLoading(false))
  }, [search, track])

  const tracks = events.flatMap(e => e.tracks)
  const trackName = id => tracks.find(t => t.id === id)?.name

  return (
    <div>
      {/* Hero */}
      <section className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-24 sm:pt-20 sm:pb-32">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-2xl">
            Build. Submit. Judge.
          </h1>
          <p className="mt-4 text-slate-300 max-w-xl text-base sm:text-lg">
            Explore projects from DOGFOOD 2026 — browse what every team has shipped,
            filter by track, and dig into the details.
          </p>
        </div>
      </section>

      {/* Search bar, floated over the hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-12 sm:-mt-14">
        <div className="card card-pad flex flex-col sm:flex-row gap-3">
          <input
            className="input flex-1"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="input sm:w-56"
            value={track}
            onChange={e => setTrack(e.target.value)}
          >
            <option value="">All tracks</option>
            {tracks.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Alert type="error">{error}</Alert>

        {loading ? (
          <LoadingState label="Loading projects…" />
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>

            {projects.length === 0 ? (
              <EmptyState
                title="No projects match your search"
                description="Try a different keyword or clear the track filter."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map(p => (
                  <div key={p.id} className="card card-pad flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="font-semibold text-ink leading-snug">{p.title}</h2>
                    </div>
                    {trackName(p.track_id) && (
                      <span className="badge-info self-start mb-3">{trackName(p.track_id)}</span>
                    )}
                    <p className="text-sm text-slate-600 flex-1">{p.summary}</p>
                    {p.repo_url && (
                      <a
                        className="link text-sm mt-4 inline-block w-fit"
                        href={p.repo_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Repository
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}