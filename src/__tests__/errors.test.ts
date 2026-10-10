import {
  AppleAuthError,
  EAppleAuthErrorCode,
  isCancelledError,
  normalizeAppleError,
} from '../errors'

describe('normalizeAppleError', () => {
  it('passes AppleAuthError through', () => {
    const original = new AppleAuthError(EAppleAuthErrorCode.Failed, 'nope')
    expect(normalizeAppleError(original)).toBe(original)
  })

  it('maps cancel-like native errors', () => {
    const error = normalizeAppleError({ code: 'ERR_REQUEST_CANCELED', message: 'canceled' })
    expect(error.code).toBe(EAppleAuthErrorCode.Canceled)
    expect(isCancelledError(error)).toBe(true)
  })

  it('parses Kotlin ERR_CODE: message exceptions', () => {
    const error = normalizeAppleError(new Error('ERR_NOT_CONFIGURED: missing client id'))
    expect(error.code).toBe('ERR_NOT_CONFIGURED')
    expect(error.message).toBe('missing client id')
  })

  it('keeps the code and the cause of an Expo Modules 2.0 rejection', () => {
    const native = Object.assign(
      new Error('A Sign in with Apple request is already in progress.'),
      { code: 'ERR_REQUEST_FAILED' }
    )
    const error = normalizeAppleError(native)
    expect(error.code).toBe(EAppleAuthErrorCode.Failed)
    expect(error.message).toBe('A Sign in with Apple request is already in progress.')
    expect(error.cause).toBe(native)
  })

  it('maps iOS 1001 and ERR_CANCELED codes', () => {
    expect(isCancelledError({ code: '1001' })).toBe(true)
    expect(isCancelledError({ code: 'ERR_CANCELED' })).toBe(true)
    expect(normalizeAppleError({ code: 'ERR_CANCELED', message: 'user cancel' }).code).toBe(
      EAppleAuthErrorCode.Canceled
    )
  })

  it('keeps unknown Error messages', () => {
    const error = normalizeAppleError(new Error('network down'))
    expect(error.code).toBe(EAppleAuthErrorCode.Unknown)
    expect(error.message).toBe('network down')
  })
})
