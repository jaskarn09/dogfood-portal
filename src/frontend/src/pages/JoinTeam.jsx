import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { Alert } from '../ui'

export default function JoinTeam() {
  const { user, loading: authLoading } = useAuth()
  const { token } = useParams()
  const navigate = useNavigate()

  const [inviteToken, setInviteToken] = useState(token || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinedTeam, setJoinedTeam] = useState(null)

  useEffect(() => {
    if (!token || authLoading || !user) return

    let cancelled = false

    api('/api/teams/join', {
      method: 'POST',
      body: { invite_token: token },
    })
      .then(team => {
        if (cancelled) return

        setJoinedTeam(team)
        setMessage(`Joined ${team.name}.`)
      })
      .catch(err => {
        if (cancelled) return

        setError(err.message)
      })
      .finally(() => {
        if (cancelled) return

        setJoining(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, authLoading, user])

  async function joinTeam(e) {
    e.preventDefault()

    setJoining(true)
    setError('')
    setMessage('')
    setJoinedTeam(null)

    try {
      const team = await api('/api/teams/join', {
        method: 'POST',
        body: {
          invite_token: inviteToken.trim(),
        },
      })

      setJoinedTeam(team)
      setMessage(`Joined ${team.name}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="min-h-[calc(100vh-4rem-53px)] flex items-center justify-center px-4 py-12">
        <div className="card card-pad w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-ink mb-2">Join a team</h1>
          <p className="text-sm text-slate-500 mb-5">
            Please log in before joining a team.
          </p>
          <Link to="/login" className="btn-primary w-full">
            Log in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem-53px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-ink">Join a team</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter the invite token you received from the team lead.
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <Alert type="success">{message}</Alert>
          <Alert type="error">{error}</Alert>
        </div>

        <div className="card card-pad">
          <form onSubmit={joinTeam} className="space-y-3">
            <div>
              <label className="field-label">Invite token</label>
              <input
                className="input"
                value={inviteToken}
                onChange={e => setInviteToken(e.target.value)}
                placeholder="Paste invite token"
                required
                disabled={Boolean(token) || joining}
              />
            </div>

            {!token && (
              <button className="btn-primary w-full" disabled={joining}>
                {joining ? 'Joining…' : 'Join team'}
              </button>
            )}

            {token && joining && (
              <p className="text-sm text-slate-500">Joining team…</p>
            )}
          </form>
        </div>

        {joinedTeam && (
          <div className="card card-pad mt-4">
            <h2 className="font-semibold text-ink mb-1">Team joined</h2>
            <p className="text-ink"><b>{joinedTeam.name}</b></p>
            <p className="text-sm text-slate-500 mb-4">
              Members: {joinedTeam.member_count}/4
            </p>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => navigate('/team')}
            >
              Go to My Team
            </button>
          </div>
        )}
      </div>
    </div>
  )
}