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
        <Navbar />

        <main className="max-w-5xl mx-auto p-4">
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
      </AuthProvider>
    </BrowserRouter>
  )
}