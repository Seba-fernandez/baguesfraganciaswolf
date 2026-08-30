import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, authHelpers } from '../lib/supabase'
import { ADMIN_EMAILS } from '../data/constants'

const AuthContext = createContext({})

// ¿Estamos volviendo de Google? (code de PKCE o token en el hash)
const volviendoDeOAuth = () =>
  typeof window !== 'undefined' &&
  (/[?&]code=/.test(window.location.search) || /access_token=/.test(window.location.hash))

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Si venimos de OAuth, arrancamos "cargando" hasta que Supabase procese el code
  // y dispare onAuthStateChange. Así ninguna ruta redirige antes de tiempo.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let listo = false

    authHelpers.getSession().then(({ session }) => {
      setUser(session?.user ?? null)
      // Si hay una vuelta de OAuth en curso y todavía no hay sesión, esperamos
      // al evento SIGNED_IN en vez de mostrar el login.
      if (!(volviendoDeOAuth() && !session)) {
        listo = true
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        listo = true
        setLoading(false)
      }
    )

    // Red de seguridad: si el OAuth nunca resuelve, no dejamos la pantalla colgada.
    const t = setTimeout(() => { if (!listo) setLoading(false) }, 4000)

    return () => { subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

  const value = {
    user,
    loading,
    isAdmin,
    signUp: authHelpers.signUp,
    signIn: authHelpers.signIn,
    signInWithGoogle: authHelpers.signInWithGoogle,
    signOut: authHelpers.signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
