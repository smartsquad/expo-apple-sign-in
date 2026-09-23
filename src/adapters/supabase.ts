import { AppleAuth } from '../AppleAuth'
import { AppleAuthError, EAppleAuthErrorCode } from '../errors'
import type { TAppleCredential, TAppleSignInOptions } from '../types'

/**
 * Minimal Supabase Auth surface used by the adapter.
 * Compatible with `createClient` from `@supabase/supabase-js`.
 */
export type TSupabaseAuthLike = {
  auth: {
    signInWithIdToken: (credentials: {
      provider: 'apple'
      token: string
      nonce?: string
    }) => Promise<unknown>
  }
}

export type SupabaseAuthLike = TSupabaseAuthLike

export async function signInWithSupabase(
  client: TSupabaseAuthLike,
  options?: TAppleSignInOptions
): Promise<{ credential: TAppleCredential; data: unknown }> {
  const credential = await AppleAuth.signIn(options)
  if (!credential.identityToken) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.MissingIdentityToken,
      'Cannot exchange Apple credentials with Supabase without an identity token.'
    )
  }

  const data = await client.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: credential.nonce,
  })

  return { credential, data }
}
