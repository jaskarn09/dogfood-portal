import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const link = 'px-3 py-2 rounded hover:bg-slate-700'

  return (
    <nav className="bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto flex items-center gap-2 p-3">
        <Link to="/" className="font-bold text-lg mr-4">DOGFOOD Portal</Link>
        <Link to="/" className={link}>Gallery</Link>
        {user?.role === 'participant' && <Link to="/team" className={link}>My Team</Link>}
        {user?.role === 'judge' && <Link to="/judge" className={link}>Judging</Link>}
        {user?.role === 'organizer' && <Link to="/organizer" className={link}>Organizer</Link>}

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-slate-300">{user.name} ({user.role})</span>
              <button onClick={logout} className={link}>Log out</button>
            </>
          ) : (
            <Link to="/login" className={link}>Log in</Link>
          )}
        </div>
      </div>
    </nav>
  )
}