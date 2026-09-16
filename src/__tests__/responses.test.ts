import { isCancelledResponse, isErrorResponse, isSuccessResponse } from '../responses'
import type { TAppleAuthResponse, TAppleCredential } from '../types'

const credential = {
  identityToken: 't',
  authorizationCode: 'c',
  nonce: 'n',
  state: null,
  user: { id: '1', email: null, givenName: null, familyName: null },
  realUserStatus: 'unknown',
} satisfies TAppleCredential

describe('response helpers', () => {
  it('narrows success', () => {
    const response: TAppleAuthResponse = { type: 'success', data: credential }
    expect(isSuccessResponse(response)).toBe(true)
    if (isSuccessResponse(response)) {
      expect(response.data.identityToken).toBe('t')
    }
  })

  it('narrows cancelled and error', () => {
    expect(isCancelledResponse({ type: 'cancelled' })).toBe(true)
    expect(isErrorResponse({ type: 'error', code: 'ERR_REQUEST_FAILED', message: 'x' })).toBe(true)
  })
})
