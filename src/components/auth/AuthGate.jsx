import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Login from './Login'
import Register from './Register'
import s from './Auth.module.css'

export default function AuthGate({ children }) {
  const { user, loading } = useAuth()
  const [mode, setMode] = useState('login')

  if (loading) {
    return (
      <div className={s.screen}>
        <div className={s.loader}>Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return mode === 'login' ? (
      <Login onSwitchToRegister={() => setMode('register')} />
    ) : (
      <Register onSwitchToLogin={() => setMode('login')} />
    )
  }

  return children
}
