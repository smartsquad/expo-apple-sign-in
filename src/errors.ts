export const EAppleAuthErrorCode = {
  Canceled: 'ERR_REQUEST_CANCELED',
  Failed: 'ERR_REQUEST_FAILED',
  NotConfigured: 'ERR_NOT_CONFIGURED',
  NotAvailable: 'ERR_NOT_AVAILABLE',
  MissingIdentityToken: 'ERR_MISSING_IDENTITY_TOKEN',
  InvalidResponse: 'ERR_INVALID_RESPONSE',
  Unknown: 'ERR_REQUEST_UNKNOWN',
} as const

export const AppleAuthErrorCode = EAppleAuthErrorCode

export type TAppleAuthErrorCodeValue =
  (typeof EAppleAuthErrorCode)[keyof typeof EAppleAuthErrorCode]

export type AppleAuthErrorCodeValue = TAppleAuthErrorCodeValue

export class AppleAuthError extends Error {
  readonly code: string
  readonly cause?: unknown

  constructor(code: string, message: string, cause?: unknown) {
    super(message)
    this.name = 'AppleAuthError'
    this.code = code
    this.cause = cause
  }
}

export function isAppleAuthError(error: unknown): error is AppleAuthError {
  return error instanceof AppleAuthError
}

export function isCancelledError(error: unknown): boolean {
  if (isAppleAuthError(error)) {
    return error.code === EAppleAuthErrorCode.Canceled
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    return (
      code === EAppleAuthErrorCode.Canceled ||
      code === 'ERR_REQUEST_CANCELED' ||
      code === 'ERR_CANCELED' ||
      code === '1001'
    )
  }

  return false
}

export function normalizeAppleError(error: unknown): AppleAuthError {
  if (error instanceof AppleAuthError) {
    return error
  }

  if (typeof error === 'object' && error !== null) {
    const maybe = error as { code?: unknown; message?: unknown; name?: unknown }
    const raw = [maybe.code, maybe.name, maybe.message]
      .filter((value) => typeof value === 'string')
      .join(' ')
    const message =
      typeof maybe.message === 'string' && maybe.message.length > 0
        ? maybe.message
        : 'Apple sign-in failed'

    if (/cancel/i.test(raw) || raw.includes('ERR_REQUEST_CANCELED')) {
      return new AppleAuthError(
        EAppleAuthErrorCode.Canceled,
        'The user canceled Apple sign-in.',
        error
      )
    }
    if (typeof maybe.code === 'string' && maybe.code.startsWith('ERR_')) {
      return new AppleAuthError(maybe.code, message, error)
    }
    const parsed =
      typeof maybe.message === 'string' ? maybe.message.match(/^(ERR_[A-Z0-9_]+):\s*(.*)$/) : null
    if (parsed) {
      return new AppleAuthError(parsed[1], parsed[2] || message, error)
    }
  }

  if (error instanceof Error) {
    return new AppleAuthError(EAppleAuthErrorCode.Unknown, error.message, error)
  }

  return new AppleAuthError(EAppleAuthErrorCode.Unknown, 'Apple sign-in failed', error)
}
