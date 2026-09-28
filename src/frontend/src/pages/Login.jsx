import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

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

  const input = 'w-full border rounded px-3 py-2'

  return (
    <div className="max-w-sm mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">
        {mode === 'login' ? 'Log in' : 'Create an account'}
      </h1>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'register' && (
          <input className={input} placeholder="Name" value={name}
                 onChange={e => setName(e.target.value)} required />
        )}
        <input className={input} type="email" placeholder="Email" value={email}
               onChange={e => setEmail(e.target.value)} required />
        <input className={input} type="password" placeholder="Password" value={password}
               onChange={e => setPassword(e.target.value)} required />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full bg-slate-900 text-white rounded py-2">
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>
      <button className="mt-4 text-sm text-blue-700 underline"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
      </button>
    </div>
  )
}