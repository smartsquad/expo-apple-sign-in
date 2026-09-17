import { decodeJwtPayload, enrichUserFromToken, toAppleCredential } from '../credential'
import { EAppleAuthErrorCode } from '../errors'

function jwtWith(payload: Record<string, unknown>): string {
  const json = globalThis.Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `aaa.${json}.ccc`
}

describe('toAppleCredential', () => {
  it('requires an identity token', () => {
    try {
      toAppleCredential({ authorizationCode: 'x' }, 'nonce')
      throw new Error('expected toAppleCredential to throw')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.MissingIdentityToken })
    }
  })

  it('returns the raw nonce, not the hash', () => {
    const credential = toAppleCredential(
      {
        identityToken: 'token',
        authorizationCode: 'code',
        user: 'user-1',
        email: 'ada@example.com',
        givenName: 'Ada',
        familyName: 'Lovelace',
        state: 'abc',
        realUserStatus: 'likelyReal',
      },
      'raw-nonce'
    )

    expect(credential.nonce).toBe('raw-nonce')
    expect(credential.identityToken).toBe('token')
    expect(credential.user).toEqual({
      id: 'user-1',
      email: 'ada@example.com',
      givenName: 'Ada',
      familyName: 'Lovelace',
    })
    expect(credential.realUserStatus).toBe('likelyReal')
  })

  it('maps native real-user status codes', () => {
    expect(toAppleCredential({ identityToken: 't', realUserStatus: '2' }, 'n').realUserStatus).toBe(
      'likelyReal'
    )
    expect(toAppleCredential({ identityToken: 't', realUserStatus: '3' }, 'n').realUserStatus).toBe(
      'unsupported'
    )
    expect(toAppleCredential({ identityToken: 't', realUserStatus: '1' }, 'n').realUserStatus).toBe(
      'unknown'
    )
  })
})

describe('enrichUserFromToken', () => {
  it('fills email and sub from the JWT when Apple omitted them', () => {
    const token = jwtWith({ sub: 'apple-user', email: 'hidden@privaterelay.appleid.com' })
    const credential = enrichUserFromToken(
      toAppleCredential({ identityToken: token, user: null, email: null }, 'n')
    )
    expect(credential.user.id).toBe('apple-user')
    expect(credential.user.email).toBe('hidden@privaterelay.appleid.com')
  })
})

describe('decodeJwtPayload', () => {
  it('returns null for garbage', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull()
  })
})
