// PostPilot — Hook d'authentification Supabase
// Gère la session, l'utilisateur courant, et les méthodes auth.

import { useEffect, useState, useCallback } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface UseAuthReturn {
  /** Session Supabase courante (null si non connecté) */
  session: Session | null
  /** Objet utilisateur courant */
  user: User | null
  /** true pendant le chargement initial de la session */
  loading: boolean
  /** Connexion par email + mot de passe */
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  /** Inscription par email + mot de passe */
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  /** Connexion via Google OAuth */
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  /** Déconnexion */
  signOut: () => Promise<void>
  /** Envoi d'un lien de réinitialisation de mot de passe */
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupération de la session existante au montage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Écoute des changements de session (login, logout, refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    [],
  )

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      })
      return { error }
    },
    [],
  )

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }, [])

  return {
    session,
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
  }
}
