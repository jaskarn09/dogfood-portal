import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from './AuthContext'

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  )
}

const navLinkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'
  }`

export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map(part => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : ''

  const closeMenu = () => setOpen(false)

  const links = (
    <>
      <NavLink to="/" end className={navLinkClass} onClick={closeMenu}>
        Gallery
      </NavLink>
      {user?.role === 'participant' && (
        <NavLink to="/team" className={navLinkClass} onClick={closeMenu}>
          My Team
        </NavLink>
      )}
      {user?.role === 'judge' && (
        <NavLink to="/judge" className={navLinkClass} onClick={closeMenu}>
          Judging
        </NavLink>
      )}
      {user?.role === 'organizer' && (
        <NavLink to="/organizer" className={navLinkClass} onClick={closeMenu}>
          Organizer
        </NavLink>
      )}
    </>
  )

  return (
    <header className="bg-ink text-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-1">
          <Link to="/" className="flex items-center gap-2 mr-3 shrink-0" onClick={closeMenu}>
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-500 font-display font-bold text-sm">
              D
            </span>
            <span className="font-display font-semibold tracking-tight hidden sm:inline">
              DOGFOOD Portal
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">{links}</nav>

          <div className="ml-auto hidden md:flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 pl-2">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-white/10 text-xs font-semibold">
                    {initials}
                  </span>
                  <div className="text-sm leading-tight">
                    <div className="text-white">{user.name}</div>
                    <div className="text-slate-400 text-xs capitalize">{user.role}</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary">
                Log in
              </Link>
            )}
          </div>

          <button
            type="button"
            className="ml-auto md:hidden p-2 rounded-lg hover:bg-white/10"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 px-4 pb-4 pt-2 space-y-1">
          {links}
          <div className="pt-3 mt-2 border-t border-white/10">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div>{user.name}</div>
                  <div className="text-slate-400 text-xs capitalize">{user.role}</div>
                </div>
                <button
                  onClick={() => {
                    closeMenu()
                    logout()
                  }}
                  className="btn-ghost text-slate-300 hover:text-white"
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary w-full" onClick={closeMenu}>
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}