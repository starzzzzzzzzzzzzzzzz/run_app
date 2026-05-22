import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login   from './pages/Login.jsx'
import Home    from './pages/Home.jsx'
import Plan    from './pages/Plan.jsx'
import Execute from './pages/Execute.jsx'
import History from './pages/History.jsx'
import Profile from './pages/Profile.jsx'

const AUTH_KEY = 'paceup_auth'

export default function App() {
  const [authed, setAuthed] = useState(()=>!!localStorage.getItem(AUTH_KEY))
  const login  = () => { localStorage.setItem(AUTH_KEY,'1'); setAuthed(true) }
  const logout = () => { localStorage.removeItem(AUTH_KEY); setAuthed(false) }
  if (!authed) return <Login onLogin={login} />
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Home onLogout={logout}/>} />
        <Route path="/plan"    element={<Plan />} />
        <Route path="/execute" element={<Execute />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*"        element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
