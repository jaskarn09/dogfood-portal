import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const box = 'border rounded-lg p-4 mb-6'
const input = 'border rounded px-3 py-2 w-full'
const btn = 'bg-slate-900 text-white rounded px-3 py-2 text-sm'

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
      <section className={box}>
        <h1 className="text-xl font-bold mb-3">Join Team</h1>

        <p className="text-slate-600 mb-4">
          Please log in before joining a team.
        </p>

        <Link to="/login" className={btn}>
          Log in
        </Link>
      </section>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Join a Team</h1>

      <p className="text-sm text-slate-600 mb-6">
        Enter the invite token you received from the team lead.
      </p>

      {message && (
        <p className="text-green-700 mb-3">
          {message}
        </p>
      )}

      {error && (
        <p className="text-red-600 mb-3">
          {error}
        </p>
      )}

      <section className={box}>
        <form onSubmit={joinTeam} className="space-y-3">
          <label className="block text-sm font-medium">
            Invite token
          </label>

          <input
            className={input}
            value={inviteToken}
            onChange={e => setInviteToken(e.target.value)}
            placeholder="Paste invite token"
            required
            disabled={Boolean(token) || joining}
          />

          {!token && (
            <button
              className={btn}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Join team'}
            </button>
          )}

          {token && joining && (
            <p className="text-sm text-slate-600">
              Joining team...
            </p>
          )}
        </form>
      </section>

      {joinedTeam && (
        <section className={box}>
          <h2 className="font-semibold mb-2">
            Team joined
          </h2>

          <p>
            <b>{joinedTeam.name}</b>
          </p>

          <p className="text-sm text-slate-600">
            Members: {joinedTeam.member_count}/4
          </p>

          <button
            type="button"
            className={`${btn} mt-4`}
            onClick={() => navigate('/team')}
          >
            Go to My Team
          </button>
        </section>
      )}
    </div>
  )
}