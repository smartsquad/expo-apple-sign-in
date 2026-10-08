import { createHash } from 'node:crypto'

import { AppleAuthError } from '../errors'
import { generateNonce, sha256Hex } from '../nonce'

describe('sha256Hex', () => {
  it('matches Node crypto for empty string', () => {
    expect(sha256Hex('')).toBe(createHash('sha256').update('', 'utf8').digest('hex'))
  })

  it('matches the FIPS 180-2 test vector for abc', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
  })

  it('matches Node crypto for a longer Unicode string', () => {
    const input = 'Sign in with Apple — Massimo 🍎'
    expect(sha256Hex(input)).toBe(createHash('sha256').update(input, 'utf8').digest('hex'))
  })
})

describe('generateNonce', () => {
  it('returns a 64-character hex string by default', () => {
    const nonce = generateNonce()
    expect(nonce).toMatch(/^[0-9a-f]{64}$/)
  })

  it('honors a custom byte length', () => {
    expect(generateNonce(16)).toMatch(/^[0-9a-f]{32}$/)
  })

  it('is unique across calls', () => {
    const values = new Set(Array.from({ length: 20 }, () => generateNonce()))
    expect(values.size).toBe(20)
  })
})

describe('generateNonce without crypto.getRandomValues', () => {
  const A = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  const B = '11111111-2222-4333-9444-555555555555'
  const A30 = 'aaaaaaaabbbbcccdddeeeeeeeeeeee'
  const B30 = '111111112222333444555555555555'
  const globals = globalThis as unknown as Record<string, unknown>
  let cryptoDescriptor: PropertyDescriptor | undefined
  let expoDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    expoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'expo')
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true })
  })

  afterEach(() => {
    if (cryptoDescriptor) {
      Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
    } else {
      delete globals.crypto
    }
    if (expoDescriptor) {
      Object.defineProperty(globalThis, 'expo', expoDescriptor)
    } else {
      delete globals.expo
    }
    jest.restoreAllMocks()
  })

  function installUuid(uuidv4: () => string): void {
    Object.defineProperty(globalThis, 'expo', { value: { uuidv4 }, configurable: true, writable: true })
  }

  it('builds bytes from consecutive uuidv4 calls', () => {
    const uuidv4 = jest.fn().mockReturnValueOnce(A).mockReturnValueOnce(B)
    installUuid(uuidv4)
    expect(generateNonce(16)).toBe(A30 + B30.slice(0, 2))
    expect(uuidv4).toHaveBeenCalledTimes(2)
  })

  it('calls uuidv4 three times for the default 32 bytes', () => {
    const uuidv4 = jest.fn().mockReturnValue(A)
    installUuid(uuidv4)
    expect(generateNonce()).toBe(A30 + A30 + 'aaaa')
    expect(uuidv4).toHaveBeenCalledTimes(3)
  })

  it('throws instead of using Math.random when no source exists', () => {
    const random = jest.spyOn(Math, 'random')
    delete globals.expo
    try {
      generateNonce()
      throw new Error('expected generateNonce to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(AppleAuthError)
      expect(error).toMatchObject({ code: 'ERR_REQUEST_FAILED' })
    }
    expect(random).not.toHaveBeenCalled()
  })

  it('throws when uuidv4 returns a malformed value', () => {
    installUuid(() => 'not-a-uuid')
    try {
      generateNonce()
      throw new Error('expected generateNonce to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(AppleAuthError)
      expect(error).toMatchObject({ code: 'ERR_REQUEST_FAILED' })
    }
  })
})
