import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import { AppleAuth, subscribeToConfig } from './AppleAuth'
import { AppleAuthError, isCancelledError, normalizeAppleError } from './errors'
import type {
  TAppleCredential,
  TAppleScope,
  TAppleSignInOptions,
  TUseAppleAuthOptions,
  TUseAppleAuthResult,
} from './types'

function getIsConfigured(): boolean {
  return AppleAuth.isConfigured()
}

/**
 * React hook around {@link AppleAuth}. Passes `clientId`, `redirectUri`, and `scopes` to
 * `AppleAuth.configure` when any of them is set, and clears the credential when Apple revokes it
 * (iOS only).
 *
 * Returns a {@link TUseAppleAuthResult}.
 */
export function useAppleAuth(options: TUseAppleAuthOptions = {}): TUseAppleAuthResult {
  const { treatCancelAsError = false, clientId, redirectUri, scopes } = options
  const scopesKey = scopes ? scopes.join(',') : undefined
  const [credential, setCredential] = useState<TAppleCredential | null>(() =>
    AppleAuth.getCurrentCredential()
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppleAuthError | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const isConfigured = useSyncExternalStore(subscribeToConfig, getIsConfigured, getIsConfigured)

  useEffect(() => {
    let nextScopes: TAppleScope[] | undefined
    if (scopesKey !== undefined) {
      nextScopes = scopesKey === '' ? [] : (scopesKey.split(',') as TAppleScope[])
    }
    if (clientId || redirectUri || nextScopes) {
      AppleAuth.configure({ clientId, redirectUri, scopes: nextScopes })
    }
  }, [clientId, redirectUri, scopesKey])

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

  useEffect(() => {
    const subscription = AppleAuth.addRevokeListener(() => {
      AppleAuth.signOut()
      setCredential(null)
    })

    return () => subscription.remove()
  }, [])

  const signIn = useCallback(
    async (signInOptions?: TAppleSignInOptions) => {
      setIsLoading(true)
      setError(null)
      try {
        const next = await AppleAuth.signIn(signInOptions)
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
    },
    [treatCancelAsError]
  )

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
    isConfigured,
  }
}
