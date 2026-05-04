'use client'

import { useEffect } from 'react'

interface BodyWrapperProps {
  children: React.ReactNode
}

export default function BodyWrapper({ children }: BodyWrapperProps) {
  useEffect(() => {
    // Remove any dynamic attributes that might cause hydration issues
    const body = document.body
    if (body) {
      // Remove extension-added attributes that cause hydration mismatch
      const attributesToRemove = ['data-new-gr-c-s-check-loaded', 'data-gr-ext-installed']
      attributesToRemove.forEach(attr => {
        if (body.hasAttribute(attr)) {
          body.removeAttribute(attr)
        }
      })
    }
  }, [])

  return <>{children}</>
}
