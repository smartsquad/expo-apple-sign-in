import { createHash } from 'node:crypto'

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
