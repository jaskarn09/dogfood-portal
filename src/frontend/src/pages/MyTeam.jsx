import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { Alert, Badge, EmptyState, LoadingState, PageHeader } from '../ui'

const emptyProject = {
  title: '',
  summary: '',
  repo_url: '',
  track_id: '',
}

export default function MyTeam() {
  const { user } = useAuth()

  const [events, setEvents] = useState([])
  const [teams, setTeams] = useState([])
  const [projects, setProjects] = useState([])

  const [teamName, setTeamName] = useState('')
  const [teamEventId, setTeamEventId] = useState('')

  const [forms, setForms] = useState({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [now, setNow] = useState(() => Date.now())

  // Keep the displayed open/closed state reasonably current.
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  async function fetchData() {
    const [eventData, teamData, projectData] = await Promise.all([
      api('/api/events'),
      api('/api/teams/mine'),
      api('/api/projects/mine'),
    ])

    return {
      eventData,
      teamData,
      projectData,
    }
  }

  function buildProjectForms(projectData, existingForms = {}) {
    const nextForms = { ...existingForms }

    for (const project of projectData) {
      nextForms[project.id] = {
        title: project.title || '',
        summary: project.summary || '',
        repo_url: project.repo_url || '',
        track_id: project.track_id || '',
      }
    }

    return nextForms
  }

  function applyData(data) {
    setEvents(data.eventData)
    setTeams(data.teamData)
    setProjects(data.projectData)

    setForms(current =>
      buildProjectForms(data.projectData, current)
    )
  }

  async function loadData() {
    try {
      const data = await fetchData()
      applyData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Initial load.
  // State changes happen inside the async callback rather than
  // synchronously in the effect body.
  useEffect(() => {
    let cancelled = false

    fetchData()
      .then(data => {
        if (cancelled) return

        setEvents(data.eventData)
        setTeams(data.teamData)
        setProjects(data.projectData)

        setForms(current =>
          buildProjectForms(data.projectData, current)
        )

        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return

        setError(err.message)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const openEvents = useMemo(() => {
    return events.filter(event => {
      return new Date(event.submissions_close).getTime() > now
    })
  }, [events, now])

  function eventById(id) {
    return events.find(event => event.id === id)
  }

  function projectForTeam(teamId) {
    return projects.find(project => project.team_id === teamId)
  }

  function formKey(team, project) {
    return project ? project.id : `new-${team.id}`
  }

  function getForm(team, project) {
    const key = formKey(team, project)

    return forms[key] || emptyProject
  }

  function updateForm(key, field, value) {
    setForms(current => ({
      ...current,
      [key]: {
        ...(current[key] || emptyProject),
        [field]: value,
      },
    }))
  }

  async function createTeam(e) {
    e.preventDefault()

    setMessage('')
    setError('')
    setSaving(true)

    try {
      await api('/api/teams', {
        method: 'POST',
        body: {
          event_id: teamEventId,
          name: teamName,
        },
      })

      setTeamName('')
      setTeamEventId('')
      setMessage('Team created.')

      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveProject(team, status) {
    const event = eventById(team.event_id)
    const project = projectForTeam(team.id)

    if (!event) {
      setError('Event not found for this team.')
      return
    }

   const form = getForm(team, project)

    setMessage('')
    setError('')
    setSaving(true)

    try {
      if (project) {
        await api(`/api/projects/${project.id}`, {
          method: 'PATCH',
          body: {
            title: form.title,
            summary: form.summary,
            repo_url: form.repo_url,
            track_id: form.track_id || null,
            status,
          },
        })
      } else {
        await api('/api/projects', {
          method: 'POST',
          body: {
            event_id: team.event_id,
            title: form.title || 'Untitled',
            summary: form.summary,
            repo_url: form.repo_url,
            track_id: form.track_id || null,
            status,
          },
        })
      }

      setMessage(
        status === 'submitted'
          ? 'Project submitted.'
          : 'Draft saved.'
      )

      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function copyInvite(team) {
    const link = `${window.location.origin}/join/${team.invite_token}`

    try {
      await navigator.clipboard.writeText(link)
      setMessage('Invite link copied.')
      setError('')
    } catch {
      setError('Could not copy the invite link.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <LoadingState label="Loading your teams…" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <PageHeader
        title="My Team"
        description={`Signed in as ${user?.name ?? ''}`}
      />

      <div className="space-y-3 mb-6">
        <Alert type="success">{message}</Alert>
        <Alert type="error">{error}</Alert>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 mb-8">
        <section className="card card-pad">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-ink">Join a team</h2>
            <Link to="/join" className="link text-sm">
              Enter invite link
            </Link>
          </div>
          <p className="text-sm text-slate-500">
            Have an invite from another participant? Use the join page.
          </p>
        </section>

        <section className="card card-pad">
          <h2 className="font-semibold text-ink mb-3">Create a team</h2>

          {openEvents.length === 0 ? (
            <p className="text-sm text-slate-500">
              There are currently no open events accepting submissions.
              An organizer must create an event with a future closing time.
            </p>
          ) : (
            <form onSubmit={createTeam} className="space-y-3">
              <input
                className="input"
                placeholder="Team name"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                required
              />

              <select
                className="input"
                value={teamEventId}
                onChange={e => setTeamEventId(e.target.value)}
                required
              >
                <option value="">Choose an open event</option>

                {openEvents.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} — closes{' '}
                    {new Date(event.submissions_close).toLocaleString()}
                  </option>
                ))}
              </select>

              <button className="btn-primary w-full" disabled={saving}>
                Create team
              </button>
            </form>
          )}
        </section>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          title="You're not on a team yet"
          description="Create a team for an open event, or join one with an invite link."
        />
      ) : (
        <div className="space-y-8">
          {teams.map(team => {
            const event = eventById(team.event_id)
            const project = projectForTeam(team.id)
            const key = formKey(team, project)
            const form = getForm(team, project)

            const eventOpen =
              event &&
              new Date(event.submissions_close).getTime() > now

            const isLead = team.lead_user_id === user?.id

            return (
              <section key={team.id}>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h2 className="font-semibold text-lg text-ink">{team.name}</h2>
                  <Badge tone={eventOpen ? 'submitted' : 'neutral'}>
                    {eventOpen ? 'Open' : 'Closed'}
                  </Badge>
                  {isLead && <Badge tone="info">Team lead</Badge>}
                </div>

                <div className="grid gap-6 lg:grid-cols-3 items-start">
                  {/* Project — takes the primary column */}
                  <div className="lg:col-span-2 card card-pad">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-ink">
                        {project ? 'Project' : 'Create project'}
                      </h3>
                      {project && (
                        <Badge tone={project.status === 'submitted' ? 'submitted' : 'draft'}>
                          {project.status === 'submitted' ? 'Submitted' : 'Draft'}
                        </Badge>
                      )}
                    </div>

                    {!eventOpen ? (
                      <div className="text-sm text-slate-600">
                        This event is closed, so the project cannot be created or edited.
                        {project && (
                          <div className="mt-2">
                            Current project: <b>{project.title}</b> ({project.status})
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="field-label">Project title</label>
                          <input
                            className="input"
                            placeholder="Project title"
                            value={form.title}
                            onChange={e => updateForm(key, 'title', e.target.value)}
                            disabled={!project && !isLead}
                          />
                        </div>

                        <div>
                          <label className="field-label">Summary</label>
                          <textarea
                            className="input"
                            rows="4"
                            placeholder="Project summary"
                            value={form.summary}
                            onChange={e => updateForm(key, 'summary', e.target.value)}
                            disabled={!project && !isLead}
                          />
                        </div>

                        <div>
                          <label className="field-label">Repository</label>
                          <input
                            className="input"
                            placeholder="GitHub repository URL"
                            value={form.repo_url}
                            onChange={e => updateForm(key, 'repo_url', e.target.value)}
                            disabled={!project && !isLead}
                          />
                        </div>

                        <div>
                          <label className="field-label">Track</label>
                          <select
                            className="input"
                            value={form.track_id}
                            onChange={e => updateForm(key, 'track_id', e.target.value)}
                            disabled={!project && !isLead}
                          >
                            <option value="">Choose a track</option>
                            {(event?.tracks || []).map(track => (
                              <option key={track.id} value={track.id}>
                                {track.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={saving || (!project && !isLead)}
                            onClick={() => saveProject(team, 'draft')}
                          >
                            Save draft
                          </button>

                          <button
                            type="button"
                            className="btn-primary"
                            disabled={saving || (!project && !isLead)}
                            onClick={() => saveProject(team, 'submitted')}
                          >
                            Submit project
                          </button>
                        </div>

                        {!isLead && !project && (
                          <p className="text-xs text-slate-500">
                            Only the team lead can create the project's first version.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Team info — sidebar column */}
                  <div className="space-y-6">
                    <div className="card card-pad">
                      <h3 className="font-semibold text-ink mb-1">Team</h3>
                      <p className="text-sm text-slate-500 mb-3">
                        {event?.name || 'Unknown event'}
                      </p>
                      <p className="text-sm text-ink">
                        {team.member_count}/4 members
                      </p>
                    </div>

                    <div className="card card-pad">
                      <p className="text-sm font-medium text-ink mb-2">Invite teammates</p>
                      <p className="text-xs text-slate-500 break-all mb-3">
                        {window.location.origin}/join/{team.invite_token}
                      </p>
                      <button
                        type="button"
                        className="btn-secondary btn-sm w-full"
                        onClick={() => copyInvite(team)}
                      >
                        Copy invite link
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}