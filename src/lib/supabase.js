import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Helpers de auth
export const authHelpers = {
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Vuelve a la raíz (ya está en la allowlist de Supabase). App.jsx
        // deja que Supabase procese el ?code antes de redirigir a /panel.
        redirectTo: `${window.location.origin}/`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) console.error('OAuth Google:', error)
    return { data, error }
  },

  signOut: async () => {
    // scope 'local': cierra solo esta sesión/dispositivo, sin tocar otras.
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    return { error }
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    return { session: data?.session, error }
  },
}
