import { AppleAuth } from '../AppleAuth'
import { signInWithClerk } from '../adapters/clerk'
import { signInWithFirebase, toFirebaseAppleCredential } from '../adapters/firebase'
import { signInWithSupabase } from '../adapters/supabase'
import { EAppleAuthErrorCode } from '../errors'
import type { TAppleCredential } from '../types'

const credential: TAppleCredential = {
  identityToken: 'apple.jwt.token',
  authorizationCode: 'code',
  nonce: 'raw-nonce',
  state: 'state',
  user: {
    id: 'u1',
    email: 'a@b.c',
    givenName: 'Ada',
    familyName: 'Lovelace',
    middleName: null,
    namePrefix: null,
    nameSuffix: null,
    nickname: null,
  },
  realUserStatus: 'likelyReal',
}

jest.mock('../AppleAuth', () => ({
  AppleAuth: {
    signIn: jest.fn(),
  },
}))

const signIn = AppleAuth.signIn as jest.Mock

beforeEach(() => {
  signIn.mockReset()
  signIn.mockResolvedValue(credential)
})

describe('signInWithSupabase', () => {
  it('sends the identity token and the raw nonce', async () => {
    const signInWithIdToken = jest.fn().mockResolvedValue({ session: { access_token: 's' } })
    const result = await signInWithSupabase({ auth: { signInWithIdToken } })

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple.jwt.token',
      nonce: 'raw-nonce',
    })
    expect(result.credential).toEqual(credential)
  })
})

describe('signInWithClerk', () => {
  it('creates a sign-up with the Apple token and name', async () => {
    const signUp = { create: jest.fn().mockResolvedValue({}), createdSessionId: 'sess_1' }
    const signInResource = { create: jest.fn(), createdSessionId: null }
    const setActive = jest.fn()

    const result = await signInWithClerk({ signIn: signInResource, signUp, setActive })

    expect(signUp.create).toHaveBeenCalledWith({
      strategy: 'oauth_token_apple',
      token: 'apple.jwt.token',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_1' })
    expect(result.createdSessionId).toBe('sess_1')
  })

  it('falls back to sign-in when sign-up throws', async () => {
    const signUp = {
      create: jest.fn().mockRejectedValue(new Error('exists')),
      createdSessionId: null,
    }
    const signInResource = { create: jest.fn().mockResolvedValue({}), createdSessionId: 'sess_2' }

    const result = await signInWithClerk({ signIn: signInResource, signUp })
    expect(signInResource.create).toHaveBeenCalledWith({
      strategy: 'oauth_token_apple',
      token: 'apple.jwt.token',
    })
    expect(result.createdSessionId).toBe('sess_2')
  })

  it('completes the transfer flow for an existing Apple user', async () => {
    const signUp = {
      create: jest.fn().mockResolvedValue({}),
      createdSessionId: null,
      verifications: { externalAccount: { status: 'transferable' } },
    }
    const signInResource: { create: jest.Mock; createdSessionId: string | null } = {
      create: jest.fn().mockImplementation(async () => {
        signInResource.createdSessionId = 'sess_3'
      }),
      createdSessionId: null,
    }
    const setActive = jest.fn()

    const result = await signInWithClerk({ signIn: signInResource, signUp, setActive })

    expect(signInResource.create).toHaveBeenCalledWith({ transfer: true })
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_3' })
    expect(result.createdSessionId).toBe('sess_3')
  })

  it('rethrows the sign-up error when sign-in can only transfer', async () => {
    const signUpError = new Error('sign-ups restricted')
    const signUp = { create: jest.fn().mockRejectedValue(signUpError), createdSessionId: null }
    const signInResource = {
      create: jest.fn().mockResolvedValue({}),
      createdSessionId: null,
      firstFactorVerification: { status: 'transferable' },
    }
    const setActive = jest.fn()

    await expect(signInWithClerk({ signIn: signInResource, signUp, setActive })).rejects.toBe(
      signUpError
    )
    expect(setActive).not.toHaveBeenCalled()
  })
})

describe('toFirebaseAppleCredential', () => {
  it('exposes token + rawNonce for OAuthProvider', () => {
    expect(toFirebaseAppleCredential(credential)).toEqual({
      providerId: 'apple.com',
      token: 'apple.jwt.token',
      rawNonce: 'raw-nonce',
    })
  })
})

describe('signInWithFirebase', () => {
  it('passes the mapped credential to signInWithCredential', async () => {
    const signInWithCredential = jest.fn().mockResolvedValue({ user: { uid: 'fb' } })
    const result = await signInWithFirebase(signInWithCredential)

    expect(signInWithCredential).toHaveBeenCalledWith({
      providerId: 'apple.com',
      token: 'apple.jwt.token',
      rawNonce: 'raw-nonce',
    })
    expect(result.credential).toEqual(credential)
    expect(result.data).toEqual({ user: { uid: 'fb' } })
  })

  it('forwards sign-in options to AppleAuth', async () => {
    const signInWithCredential = jest.fn().mockResolvedValue({})
    await signInWithFirebase(signInWithCredential, { nonce: 'custom', scopes: ['email'] })
    expect(signIn).toHaveBeenCalledWith({ nonce: 'custom', scopes: ['email'] })
  })
})

describe('adapter identity token guard', () => {
  const emptyToken = { ...credential, identityToken: '' }

  beforeEach(() => {
    signIn.mockResolvedValue(emptyToken)
  })

  it('rejects Supabase exchange without a token', async () => {
    try {
      await signInWithSupabase({ auth: { signInWithIdToken: jest.fn() } })
      throw new Error('expected supabase adapter to throw')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.MissingIdentityToken })
    }
  })

  it('rejects Clerk exchange without a token', async () => {
    try {
      await signInWithClerk({
        signIn: { create: jest.fn() },
        signUp: { create: jest.fn() },
      })
      throw new Error('expected clerk adapter to throw')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.MissingIdentityToken })
    }
  })

  it('rejects Firebase exchange without a token', async () => {
    try {
      await signInWithFirebase(jest.fn())
      throw new Error('expected firebase adapter to throw')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.MissingIdentityToken })
    }
  })
})
