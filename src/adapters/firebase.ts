import { AppleAuth } from '../AppleAuth'
import { AppleAuthError, EAppleAuthErrorCode } from '../errors'
import type { TAppleCredential, TAppleSignInOptions } from '../types'

export type TFirebaseAppleCredential = {
  providerId: 'apple.com'
  token: string
  rawNonce: string
}

export type FirebaseAppleCredential = TFirebaseAppleCredential

/**
 * Shape expected by `OAuthProvider('apple.com').credential({ idToken, rawNonce })`.
 */
export function toFirebaseAppleCredential(credential: TAppleCredential): TFirebaseAppleCredential {
  return {
    providerId: 'apple.com',
    token: credential.identityToken,
    rawNonce: credential.nonce,
  }
}

export async function signInWithFirebase(
  signInWithCredential: (credential: TFirebaseAppleCredential) => Promise<unknown>,
  options?: TAppleSignInOptions
): Promise<{ credential: TAppleCredential; data: unknown }> {
  const credential = await AppleAuth.signIn(options)
  if (!credential.identityToken) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.MissingIdentityToken,
      'Cannot exchange Apple credentials with Firebase without an identity token.'
    )
  }
  const data = await signInWithCredential(toFirebaseAppleCredential(credential))

  return { credential, data }
}
