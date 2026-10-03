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
        // Pide volver directo al panel. Si /panel no está en la lista de
        // direcciones permitidas de Supabase, Supabase usa su "Site URL"; en
        // ese caso se cae en la raíz (o en el dominio viejo, que redirige al
        // nuevo) y el script de index.html desvía la vuelta a /panel con el
        // token intacto. Las dos rutas terminan en el panel con sesión.
        redirectTo: `${window.location.origin}/panel`,
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
