import { useAuth } from '../../contexts/AuthContext'
import Login from './Login'
import s from './Auth.module.css'

// Bypass SOLO para QA visual en desarrollo local — nunca existe en el build de
// producción: import.meta.env.DEV es `false` en `vite build` y Rollup elimina
// esta rama por completo (dead-code elimination), no queda ni el código.
// Actívalo navegando a /panel?qa=1 en `npm run dev`. Los datos reales (pedidos,
// clientes) igual no se ven porque RLS los sigue bloqueando sin sesión real —
// sirve para revisar layout/estilos, no para operar el panel.
const qaBypass = import.meta.env.DEV && new URLSearchParams(window.location.search).has('qa')

export default function AuthGate({ children }) {
  const { user, isAdmin, loading, signOut } = useAuth()

  if (qaBypass) return children

  if (loading) {
    return (
      <div className={s.screen}>
        <div className={s.loader}>Cargando...</div>
      </div>
    )
  }

  if (!user) {
    // Sin pantalla de registro: el panel es de una sola cuenta y cualquier
    // alta nueva quedaba como usuario huérfano sin acceso.
    return <Login />
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
