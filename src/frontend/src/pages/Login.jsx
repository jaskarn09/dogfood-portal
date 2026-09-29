import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { Alert } from '../ui'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') await login(email, password)
      else await register(name, email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem-53px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <span className="grid place-items-center w-11 h-11 rounded-xl bg-ink text-white font-display font-bold mb-4">
            D
          </span>
          <h1 className="text-xl font-bold text-ink">
            {mode === 'login' ? 'Welcome back' : 'Join DOGFOOD 2026'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login'
              ? 'Log in to build, submit, or judge.'
              : 'Create an account to get started.'}
          </p>
        </div>

        <div className="card card-pad">
          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="field-label" htmlFor="name">Name</label>
                <input
                  id="name"
                  className="input"
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <Alert type="error">{error}</Alert>

            <button className="btn-primary w-full">
              {mode === 'login' ? 'Log in' : 'Sign up'}
            </button>
          </form>
        </div>

        <div className="text-center mt-5 space-y-2">
          <button
            type="button"
            className="text-sm link"
            onClick={() => {
              setError('')
              setMode(mode === 'login' ? 'register' : 'login')
            }}
          >
            {mode === 'login' ? "Need an account? Sign up" : 'Have an account? Log in'}
          </button>
          <p className="text-sm">
            <Link to="/" className="text-slate-500 hover:text-ink">
              Back to the gallery
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}