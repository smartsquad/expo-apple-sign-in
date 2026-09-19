import { useCallback, useEffect, useState } from 'react'

import { AppleAuth } from './AppleAuth'
import { AppleAuthError, isCancelledError, normalizeAppleError } from './errors'
import type { TAppleCredential, TUseAppleAuthOptions } from './types'

export function useAppleAuth(options: TUseAppleAuthOptions = {}) {
  const { treatCancelAsError = false, clientId, redirectUri, scopes } = options
  const [credential, setCredential] = useState<TAppleCredential | null>(() =>
    AppleAuth.getCurrentCredential()
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppleAuthError | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)

  useEffect(() => {
    if (clientId || redirectUri || scopes) {
      AppleAuth.configure({ clientId, redirectUri, scopes })
    }
  }, [clientId, redirectUri, scopes])

  useEffect(() => {
    let cancelled = false
    AppleAuth.isAvailable()
      .then((value) => {
        if (!cancelled) {
          setIsAvailable(value)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAvailable(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const next = await AppleAuth.signIn()
      setCredential(next)

      return next
    } catch (caught) {
      const normalized = normalizeAppleError(caught)
      if (isCancelledError(normalized) && !treatCancelAsError) {
        return null
      }
      setError(normalized)
      throw normalized
    } finally {
      setIsLoading(false)
    }
  }, [treatCancelAsError])

  const signOut = useCallback(async () => {
    await AppleAuth.signOut()
    setCredential(null)
    setError(null)
  }, [])

  return {
    signIn,
    signOut,
    credential,
    isLoading,
    error,
    isAvailable,
    isConfigured: AppleAuth.isConfigured(),
  }
}
