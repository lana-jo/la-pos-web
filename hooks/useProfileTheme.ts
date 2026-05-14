'use client'

import { useCallback, useEffect, useRef, useState, startTransition } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/AuthContext'
import { ThemePreference } from '@/types'
import { updateProfile } from '@/lib/profile/actions-new'

export function useProfileTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { profile, user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const manualThemeRef = useRef<string | null>(null)

  useEffect(() => {
    startTransition(() => {
      setMounted(true)
    })
  }, [])

  // Reset manual-change flag when user logs out
  useEffect(() => {
    if (!user) {
      manualThemeRef.current = null
    }
  }, [user])

  // Apply theme from profile when user logs in — only on initial profile load
  useEffect(() => {
    if (user && profile?.theme_preference) {
      // Jangan timpa pilihan manual user
      if (manualThemeRef.current !== null) {
        return
      }
      setTheme(profile.theme_preference)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.theme_preference])

  // Save theme to profile when user changes it manually
  const setThemeWithProfile = useCallback(
    async (newTheme: ThemePreference) => {
      console.log(`[THEME] User changing theme from "${theme}" to "${newTheme}"`, {
        userId: user?.id,
        userEmail: user?.email,
        previousTheme: theme,
        newTheme,
        timestamp: new Date().toISOString()
      })
      
      manualThemeRef.current = newTheme
      setTheme(newTheme)

      if (user) {
        try {
          const result = await updateProfile(user.id, {
            full_name: profile?.full_name || '',
            theme_preference: newTheme
          })
          console.log(`[THEME] Theme preference saved to database:`, {
            userId: user.id,
            theme: newTheme,
            success: result.success,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          console.error('[THEME] Failed to save theme preference:', error)
        }
      } else {
        console.log(`[THEME] Theme changed locally (user not authenticated):`, {
          newTheme,
          timestamp: new Date().toISOString()
        })
      }
    },
    [setTheme, user, theme]
  )

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
