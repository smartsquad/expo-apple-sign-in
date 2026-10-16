import { AppleAuth } from '../apple-auth'
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

/** Alias of {@link TSupabaseAuthLike}. */
export type SupabaseAuthLike = TSupabaseAuthLike

/**
 * Signs in with Apple, then calls `client.auth.signInWithIdToken({ provider: 'apple', token,
 * nonce })` with the identity token and the raw nonce. Returns the Apple credential and Supabase's
 * response as `data`. Throws `ERR_MISSING_IDENTITY_TOKEN` when there is no identity token.
 */
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
