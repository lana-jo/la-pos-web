'use client'

import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function useTheme() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    if (!mounted) return
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const setLightMode = () => setTheme('light')
  const setDarkMode = () => setTheme('dark')
  const setSystemMode = () => setTheme('system')

  return {
    theme,
    setTheme,
    systemTheme,
    resolvedTheme,
    mounted,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    toggleTheme,
    setLightMode,
    setDarkMode,
    setSystemMode,
  }
}

// Utility function untuk memeriksa apakah dark mode aktif
export const isDarkMode = () => {
  if (typeof window === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

// Utility function untuk mendapatkan theme value
export const getThemeValue = (lightValue: string, darkValue: string) => {
  return isDarkMode() ? darkValue : lightValue
}

// Utility function untuk conditional class names yang lebih simple dan tidak konflik
export const getThemeClass = (lightClass: string, darkClass: string) => {
  // SSR-safe approach - return lightClass during SSR to prevent hydration mismatch
  // Theme will be applied client-side via useEffect
  if (typeof window === 'undefined') return lightClass
  return document.documentElement.classList.contains('dark') ? darkClass : lightClass
}

// Hook-based version that's properly SSR-safe
export const useThemeClass = (lightClass: string, darkClass: string) => {
  const { mounted, resolvedTheme } = useTheme()
  
  // Return lightClass during SSR to prevent hydration mismatch
  if (!mounted) return lightClass
  
  return resolvedTheme === 'dark' ? darkClass : lightClass
}

// Utility function khusus untuk sidebar yang lebih terisolasi
export const getSidebarThemeClass = (lightClass: string, darkClass: string) => {
  return getThemeClass(lightClass, darkClass)
}