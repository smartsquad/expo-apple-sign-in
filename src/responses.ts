import type {
  TAppleAuthCancelledResponse,
  TAppleAuthErrorResponse,
  TAppleAuthResponse,
  TAppleAuthSuccessResponse,
} from './types'

export function isSuccessResponse(
  response: TAppleAuthResponse
): response is TAppleAuthSuccessResponse {
  return response.type === 'success'
}

export function isCancelledResponse(
  response: TAppleAuthResponse
): response is TAppleAuthCancelledResponse {
  return response.type === 'cancelled'
}

export function isErrorResponse(response: TAppleAuthResponse): response is TAppleAuthErrorResponse {
  return response.type === 'error'
}
