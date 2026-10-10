import type {
  TAppleAuthCancelledResponse,
  TAppleAuthErrorResponse,
  TAppleAuthResponse,
  TAppleAuthSuccessResponse,
} from './types'

/** Narrows an `AppleAuth.request` response to the success case. */
export function isSuccessResponse(
  response: TAppleAuthResponse
): response is TAppleAuthSuccessResponse {
  return response.type === 'success'
}

/** Narrows an `AppleAuth.request` response to the cancelled case. */
export function isCancelledResponse(
  response: TAppleAuthResponse
): response is TAppleAuthCancelledResponse {
  return response.type === 'cancelled'
}

/** Narrows an `AppleAuth.request` response to the error case. */
export function isErrorResponse(response: TAppleAuthResponse): response is TAppleAuthErrorResponse {
  return response.type === 'error'
}
