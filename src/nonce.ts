import { AppleAuthError, EAppleAuthErrorCode } from './errors'

type TExpoGlobal = { uuidv4?: () => string }

const HEX = '0123456789abcdef'

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) {
    const value = bytes[i]
    out += HEX[(value >>> 4) & 0xf] + HEX[value & 0xf]
  }
  return out
}

function noSecureRandomError(): AppleAuthError {
  return new AppleAuthError(
    EAppleAuthErrorCode.Failed,
    'No secure random source is available to generate a nonce. Install a crypto.getRandomValues polyfill or pass nonce and state to AppleAuth.signIn.'
  )
}

/** Keeps the 30 random hex digits of a UUIDv4 and drops the version and variant digits. */
function uuidRandomHex(uuid: string): string {
  const hex = uuid.toLowerCase().replace(/-/g, '')
  if (!/^[0-9a-f]{32}$/.test(hex)) {
    throw noSecureRandomError()
  }

  return hex.slice(0, 12) + hex.slice(13, 16) + hex.slice(17)
}

function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  const cryptoObject = globalThis.crypto
  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    cryptoObject.getRandomValues(bytes)

    return bytes
  }

  const uuidv4 = (globalThis as unknown as { expo?: TExpoGlobal }).expo?.uuidv4
  if (typeof uuidv4 !== 'function') {
    throw noSecureRandomError()
  }

  let hex = ''
  while (hex.length < size * 2) {
    hex += uuidRandomHex(uuidv4())
  }
  for (let i = 0; i < size; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }

  return bytes
}

/**
 * Hex nonce from a secure random source, 32 bytes (64 hex characters) by
 * default. Uses crypto.getRandomValues when the runtime has it and Expo's
 * native uuidv4 on iOS and Android otherwise. Throws an AppleAuthError with
 * ERR_REQUEST_FAILED when neither exists.
 */
export function generateNonce(byteLength = 32): string {
  return bytesToHex(randomBytes(byteLength))
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount))
}

/**
 * SHA-256 hex digest. Works in React Native, browsers, and Node without
 * `expo-crypto`. That extra package is the main reason current Supabase
 * Expo snippets are so noisy.
 */
export function sha256Hex(message: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(message)
  const bitLength = bytes.length * 8
  const withOne = bytes.length + 1
  const paddedLength = Math.ceil((withOne + 8) / 64) * 64
  const padded = new Uint8Array(paddedLength)
  padded.set(bytes)
  padded[bytes.length] = 0x80

  const view = new DataView(padded.buffer)
  view.setUint32(paddedLength - 4, bitLength, false)

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]

  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  const w = new Int32Array(64)

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getInt32(offset + i * 4, false)
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7

    for (let i = 0; i < 64; i += 1) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + k[i] + w[i]) | 0
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) | 0

      h = g
      g = f
      f = e
      e = (d + temp1) | 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) | 0
    }

    h0 = (h0 + a) | 0
    h1 = (h1 + b) | 0
    h2 = (h2 + c) | 0
    h3 = (h3 + d) | 0
    h4 = (h4 + e) | 0
    h5 = (h5 + f) | 0
    h6 = (h6 + g) | 0
    h7 = (h7 + h) | 0
  }

  const digest = new Uint8Array(32)
  const digestView = new DataView(digest.buffer)
  digestView.setUint32(0, h0, false)
  digestView.setUint32(4, h1, false)
  digestView.setUint32(8, h2, false)
  digestView.setUint32(12, h3, false)
  digestView.setUint32(16, h4, false)
  digestView.setUint32(20, h5, false)
  digestView.setUint32(24, h6, false)
  digestView.setUint32(28, h7, false)
  return bytesToHex(digest)
}
