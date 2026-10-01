import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import s from './Auth.module.css'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

// Mensajes de Supabase traducidos a lo que hay que hacer. La cuenta del panel
// es de Google: ingresar con email y contraseña devuelve "Invalid login
// credentials" aunque el email sea el correcto, porque esa cuenta no tiene
// contraseña. Sin traducir, eso se leía como "el usuario no existe".
function traducir(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials'))
    return 'Ese email no tiene contraseña cargada. Tu cuenta del panel entra con Google.'
  if (m.includes('email not confirmed')) return 'Falta confirmar el email.'
  if (m.includes('redirect') || m.includes('not allowed'))
    return 'Supabase rechazó la vuelta al sitio. Revisá la URL del sitio en Supabase (Authentication, URL Configuration).'
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión con la base. Probá de nuevo.'
  return msg || 'No se pudo ingresar.'
}

// Si Google o Supabase devolvieron un error en la URL, se muestra en vez de
// volver al formulario en silencio.
function errorDeVuelta() {
  if (typeof window === 'undefined') return ''
  const p = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''))
  const e = p.get('error_description') || p.get('error')
  return e ? traducir(e.replace(/\+/g, ' ')) : ''
}

export default function Login() {
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(errorDeVuelta)
  const [conClave, setConClave] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    if (error) setError(traducir(error.message))
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(traducir(error.message))
      setGoogleLoading(false)
    }
    // si no hay error, el navegador redirige a Google en este mismo instante
  }

  return (
    <div className={s.screen}>
      <div className={`${s.card} glass`}>
        <h1 className={s.title}>Bagues Grupo Wolf</h1>
        <p className={s.subtitle}>Panel de gestión, acceso privado</p>

        <button onClick={handleGoogle} className={`${s.btn} ${s.google}`} disabled={googleLoading}>
          <GoogleIcon />
          {googleLoading ? 'Abriendo Google…' : 'Ingresar con Google'}
        </button>

        {error && <p className={s.error} role="alert">{error}</p>}

        {conClave ? (
          <form onSubmit={handleSubmit} className={s.form}>
            <label className={s.label} htmlFor="login-email">EMAIL</label>
            <input
              id="login-email"
              type="email"
              className={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <label className={s.label} htmlFor="login-clave">CONTRASEÑA</label>
            <input
              id="login-clave"
              type="password"
              className={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <button type="submit" className={`${s.btn} ${s.primary}`} disabled={loading}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <p className={s.switch}>
            <button type="button" onClick={() => setConClave(true)} className={s.link}>
              Ingresar con email y contraseña
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
