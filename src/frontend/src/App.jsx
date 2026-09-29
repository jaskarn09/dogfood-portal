import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Navbar from './Navbar'
import Gallery from './pages/Gallery'
import Login from './pages/Login'
import Organizer from './pages/Organizer'
import Judge from './pages/Judge'
import MyTeam from './pages/MyTeam'
import JoinTeam from './pages/JoinTeam'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-canvas">
          <Navbar />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Gallery />} />
              <Route path="/login" element={<Login />} />
              <Route path="/organizer" element={<Organizer />} />
              <Route path="/judge" element={<Judge />} />
              <Route path="/team" element={<MyTeam />} />
              <Route path="/join" element={<JoinTeam />} />
              <Route path="/join/:token" element={<JoinTeam />} />
            </Routes>
          </main>

          <footer className="border-t border-line">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-slate-400">
              DOGFOOD 2026
            </div>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}