import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Login from './Login'
import Register from './Register'

export default function AuthGate({ children }) {
  const { user, loading } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="auth-loader">Cargando...</div>
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
