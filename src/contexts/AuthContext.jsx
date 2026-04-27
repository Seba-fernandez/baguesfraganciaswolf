import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, authHelpers } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sesión inicial
    authHelpers.getSession().then(({ session }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading,
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
