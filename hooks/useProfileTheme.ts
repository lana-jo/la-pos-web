'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/AuthContext'
import { ThemePreference } from '@/types'
import { updateThemePreference } from '@/lib/auth/user-actions'

export function useProfileTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { profile, user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Apply theme from profile when user logs in
  useEffect(() => {
    if (user && profile?.theme_preference) {
      setTheme(profile.theme_preference)
    }
  }, [user, profile?.theme_preference, setTheme])

  // Save theme to profile when user changes it manually
  const setThemeWithProfile = async (newTheme: ThemePreference) => {
    setTheme(newTheme)
    
    if (user) {
      try {
        await updateThemePreference(newTheme)
      } catch (error) {
        console.error('Failed to save theme preference:', error)
      }
    }
  }

  return {
    theme: (theme as ThemePreference) || 'system',
    resolvedTheme,
    setTheme: setThemeWithProfile,
    isSynced: !!user && !!profile,
    mounted,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  }
}
