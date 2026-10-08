import { AppleAuth } from '../AppleAuth'
import { AppleAuthError, EAppleAuthErrorCode } from '../errors'
import type { TAppleCredential, TAppleSignInOptions } from '../types'

type TClerkVerification = { status?: string | null } | null

type TClerkSignIn = {
  create(params: Record<string, unknown>): Promise<unknown>
  createdSessionId?: string | null
  firstFactorVerification?: TClerkVerification
}

type TClerkSignUp = {
  create(params: Record<string, unknown>): Promise<unknown>
  createdSessionId?: string | null
  verifications?: { externalAccount?: TClerkVerification } | null
}

type TSetActive = (params: { session: string }) => Promise<unknown>

type TClerkParams = {
  signIn: TClerkSignIn
  signUp: TClerkSignUp
  setActive?: TSetActive
}

async function exchangeAppleToken(
  params: TClerkParams,
  credential: TAppleCredential
): Promise<string | null> {
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
  } catch (signUpError) {
    await params.signIn.create(tokenPayload)
    if (params.signIn.firstFactorVerification?.status === 'transferable') {
      throw signUpError
    }

    return params.signIn.createdSessionId ?? null
  }

  if (params.signUp.verifications?.externalAccount?.status === 'transferable') {
    await params.signIn.create({ transfer: true })

    return params.signIn.createdSessionId ?? null
  }

  return params.signUp.createdSessionId ?? null
}

/**
 * Takes the objects returned by `useSignIn()` and `useSignUp()` from `@clerk/expo/legacy`,
 * sends the Apple identity token with `oauth_token_apple`, and follows Clerk's transfer
 * step for Apple IDs that already have a Clerk user. This is the same flow
 * `@clerk/expo/apple` runs, without `expo-apple-authentication` or `expo-crypto`.
 */
export async function signInWithClerk(
  params: TClerkParams,
  options?: TAppleSignInOptions
): Promise<{ credential: TAppleCredential; createdSessionId: string | null }> {
  const credential = await AppleAuth.signIn(options)
  if (!credential.identityToken) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.MissingIdentityToken,
      'Cannot exchange Apple credentials with Clerk without an identity token.'
    )
  }

  const createdSessionId = await exchangeAppleToken(params, credential)
  if (createdSessionId && params.setActive) {
    await params.setActive({ session: createdSessionId })
  }

  return { credential, createdSessionId }
}
