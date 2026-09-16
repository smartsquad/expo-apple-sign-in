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
