'use client'

import { useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'

type ExecuteOptions<T> = {
  onSuccess?: (result: T) => void
  onError?:   (err: Error) => void
}

export function usePOSAction() {
  const locked = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const execute = useCallback(async <T>(
      fn: () => Promise<T>,
      options?: ExecuteOptions<T>
  ): Promise<T | null> => {
    if (locked.current) return null   // instant block — no re-render delay

    locked.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fn()
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      const caught = err instanceof Error ? err : new Error('Unknown error')
      setError(caught.message)
      options?.onError?.(caught)
      toast.error(caught.message)
      return null
    } finally {
      locked.current = false   // always release, even on error
      setIsLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { execute, isLoading, error, clearError }
}