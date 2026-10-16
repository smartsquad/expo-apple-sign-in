import { AppleAuth } from '../apple-auth'
import { AppleAuthError, EAppleAuthErrorCode } from '../errors'
import type { TAppleCredential, TAppleSignInOptions } from '../types'

/** Identity token and raw nonce for Firebase's `apple.com` provider. */
export type TFirebaseAppleCredential = {
  providerId: 'apple.com'
  token: string
  rawNonce: string
}

/** Alias of {@link TFirebaseAppleCredential}. */
export type FirebaseAppleCredential = TFirebaseAppleCredential

/**
 * Maps an Apple credential to `{ providerId: 'apple.com', token, rawNonce }`, where `token` is
 * the identity token and `rawNonce` the raw nonce. With the Firebase JS SDK pass them to
 * `new OAuthProvider(providerId).credential({ idToken: token, rawNonce })`; with React Native
 * Firebase pass them to `AppleAuthProvider.credential(token, rawNonce)`.
 */
export function toFirebaseAppleCredential(credential: TAppleCredential): TFirebaseAppleCredential {
  return {
    providerId: 'apple.com',
    token: credential.identityToken,
    rawNonce: credential.nonce,
  }
}

/**
 * Signs in with Apple and passes the {@link toFirebaseAppleCredential} output to your
 * `signInWithCredential` callback. Returns the Apple credential and the callback result as
 * `data`. Throws `ERR_MISSING_IDENTITY_TOKEN` when there is no identity token.
 */
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
