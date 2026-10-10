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
      middleName: null,
      namePrefix: null,
      nameSuffix: null,
      nickname: null,
    })
    expect(credential.realUserStatus).toBe('likelyReal')
  })

  it('maps the iOS-only name fields', () => {
    const credential = toAppleCredential(
      {
        identityToken: 't',
        middleName: 'Byron',
        namePrefix: 'Dr.',
        nameSuffix: 'Jr.',
        nickname: 'Ace',
      },
      'n'
    )

    expect(credential.user).toMatchObject({
      middleName: 'Byron',
      namePrefix: 'Dr.',
      nameSuffix: 'Jr.',
      nickname: 'Ace',
    })
  })

  it('turns blank iOS-only name fields into null', () => {
    const credential = toAppleCredential(
      { identityToken: 't', middleName: '', namePrefix: '  ', nameSuffix: '', nickname: ' ' },
      'n'
    )

    expect(credential.user).toMatchObject({
      middleName: null,
      namePrefix: null,
      nameSuffix: null,
      nickname: null,
    })
  })

  it('turns missing iOS-only name fields into null', () => {
    const credential = toAppleCredential({ identityToken: 't' }, 'n')

    expect(credential.user).toMatchObject({
      middleName: null,
      namePrefix: null,
      nameSuffix: null,
      nickname: null,
    })
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

  it('keeps the other user fields while filling id and email', () => {
    const token = jwtWith({ sub: 'apple-user', email: 'hidden@privaterelay.appleid.com' })
    const credential = enrichUserFromToken(
      toAppleCredential(
        {
          identityToken: token,
          user: null,
          email: null,
          givenName: 'Ada',
          familyName: 'Lovelace',
          middleName: 'Byron',
          namePrefix: 'Dr.',
          nameSuffix: 'Jr.',
          nickname: 'Ace',
        },
        'n'
      )
    )

    expect(credential.user).toEqual({
      id: 'apple-user',
      email: 'hidden@privaterelay.appleid.com',
      givenName: 'Ada',
      familyName: 'Lovelace',
      middleName: 'Byron',
      namePrefix: 'Dr.',
      nameSuffix: 'Jr.',
      nickname: 'Ace',
    })
  })
})

describe('decodeJwtPayload', () => {
  it('returns null for garbage', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull()
  })
})
