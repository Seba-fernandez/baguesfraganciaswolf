import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Login from './Login'
import Register from './Register'
import s from './Auth.module.css'

export default function AuthGate({ children }) {
  const { user, isAdmin, loading, signOut } = useAuth()
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

  // Logueado pero sin permiso de admin.
  if (!isAdmin) {
    return (
      <div className={s.screen}>
        <div className={`${s.card} glass-strong`}>
          <h1 className={s.title}>Panel privado</h1>
          <p className={s.subtitle}>
            La cuenta <strong>{user.email}</strong> no tiene acceso a este panel.
          </p>
          <button className={`${s.btn} ${s.primary}`} onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return children
}
