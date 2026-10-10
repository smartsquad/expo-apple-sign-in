import { AppleAuthError, EAppleAuthErrorCode } from './errors'
import type {
  TAppleCredential,
  TAppleRealUserStatus,
  TAppleUser,
  TNativeSignInResult,
} from './types'

function asString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function realUserStatus(value: string | null | undefined): TAppleRealUserStatus {
  switch (value) {
    case 'likelyReal':
    case '2':
      return 'likelyReal'
    case 'unsupported':
    case '3':
      return 'unsupported'
    default:
      return 'unknown'
  }
}

/**
 * Normalizes a native or web sign-in result into a {@link TAppleCredential}. Missing or blank
 * strings become null, and `rawNonce` is returned as `nonce`. Throws `ERR_MISSING_IDENTITY_TOKEN`
 * when the result has no identity token.
 */
export function toAppleCredential(result: TNativeSignInResult, rawNonce: string): TAppleCredential {
  const identityToken = asString(result.identityToken)
  if (!identityToken) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.MissingIdentityToken,
      'Apple did not return an identity token. The user may have canceled, or the Services ID / App ID is misconfigured.'
    )
  }

  const user: TAppleUser = {
    id: asString(result.user),
    email: asString(result.email),
    givenName: asString(result.givenName),
    familyName: asString(result.familyName),
    middleName: asString(result.middleName),
    namePrefix: asString(result.namePrefix),
    nameSuffix: asString(result.nameSuffix),
    nickname: asString(result.nickname),
  }

  return {
    identityToken,
    authorizationCode: asString(result.authorizationCode),
    nonce: rawNonce,
    state: asString(result.state),
    user,
    realUserStatus: realUserStatus(result.realUserStatus),
  }
}

/** Decodes a JWT payload without verifying the signature. Returns null for a malformed token. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) {
    return null
  }
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const json = decodeBase64(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function decodeBase64(value: string): string {
  if (typeof atob === 'function') {
    return atob(value)
  }
  const nodeBuffer = (
    globalThis as {
      Buffer?: { from: (data: string, enc: string) => { toString: (enc: string) => string } }
    }
  ).Buffer
  if (nodeBuffer) {
    return nodeBuffer.from(value, 'base64').toString('utf8')
  }
  throw new Error('No base64 decoder available')
}

/**
 * Fills a missing `user.id` from the identity token's `sub` claim and a missing `user.email` from
 * its `email` claim. Every other user field is kept as is.
 */
export function enrichUserFromToken(credential: TAppleCredential): TAppleCredential {
  if (credential.user.email && credential.user.id) {
    return credential
  }
  const payload = decodeJwtPayload(credential.identityToken)
  if (!payload) {
    return credential
  }
  return {
    ...credential,
    user: {
      ...credential.user,
      id: credential.user.id ?? (typeof payload.sub === 'string' ? payload.sub : null),
      email: credential.user.email ?? (typeof payload.email === 'string' ? payload.email : null),
    },
  }
}
