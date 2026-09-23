import { AppleAuth } from '../AppleAuth'
import { AppleAuthError, EAppleAuthErrorCode } from '../errors'
import type { TAppleCredential, TAppleSignInOptions } from '../types'

type TClerkResource = {
  create: (params: Record<string, unknown>) => Promise<unknown>
  createdSessionId?: string | null
  firstFactorVerification?: { status?: string | null }
}

type TSetActive = (params: { session: string }) => Promise<unknown>

/**
 * Clerk adapter that feeds Apple's identity token into
 * `oauth_token_apple`, the same strategy `@clerk/expo/apple` uses,
 * without pulling in `expo-apple-authentication` or `expo-crypto`.
 */
export async function signInWithClerk(
  params: {
    signIn: TClerkResource
    signUp: TClerkResource
    setActive?: TSetActive
  },
  options?: TAppleSignInOptions
): Promise<{ credential: TAppleCredential; createdSessionId: string | null }> {
  const credential = await AppleAuth.signIn(options)
  if (!credential.identityToken) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.MissingIdentityToken,
      'Cannot exchange Apple credentials with Clerk without an identity token.'
    )
  }

  const tokenPayload = {
    strategy: 'oauth_token_apple',
    token: credential.identityToken,
  }

  try {
    await params.signUp.create({
      ...tokenPayload,
      firstName: credential.user.givenName ?? undefined,
      lastName: credential.user.familyName ?? undefined,
    })
  } catch {
    await params.signIn.create(tokenPayload)
  }

  const createdSessionId = params.signIn.createdSessionId ?? params.signUp.createdSessionId ?? null
  if (createdSessionId && params.setActive) {
    await params.setActive({ session: createdSessionId })
  }

  return { credential, createdSessionId }
}
