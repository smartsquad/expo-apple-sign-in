export { AppleAuth } from './AppleAuth'
export {
  AppleButton,
  APPLE_BUTTON_HEIGHT,
  type IAppleButtonProps,
  type AppleButtonProps,
} from './AppleButton'
export { AppleLogo } from './AppleLogo'
export { useAppleAuth } from './useAppleAuth'
export {
  AppleAuthError,
  AppleAuthErrorCode,
  EAppleAuthErrorCode,
  isAppleAuthError,
  isCancelledError,
  normalizeAppleError,
} from './errors'
export { isCancelledResponse, isErrorResponse, isSuccessResponse } from './responses'
export {
  signInWithSupabase,
  type TSupabaseAuthLike,
  type SupabaseAuthLike,
} from './adapters/supabase'
export { generateNonce, sha256Hex } from './nonce'
export type {
  TAppleAuthConfig,
  TAppleAuthErrorResponse,
  TAppleAuthResponse,
  TAppleAuthSuccessResponse,
  TAppleAuthCancelledResponse,
  TAppleButtonStyle,
  TAppleButtonType,
  TAppleCredential,
  TAppleCredentialState,
  TAppleRealUserStatus,
  TAppleScope,
  TAppleSignInOptions,
  TAppleUser,
  TUseAppleAuthOptions,
  AppleAuthConfig,
  AppleAuthErrorResponse,
  AppleAuthResponse,
  AppleAuthSuccessResponse,
  AppleAuthCancelledResponse,
  AppleButtonStyle,
  AppleButtonType,
  AppleCredential,
  AppleCredentialState,
  AppleRealUserStatus,
  AppleScope,
  AppleSignInOptions,
  AppleUser,
  UseAppleAuthOptions,
} from './types'
