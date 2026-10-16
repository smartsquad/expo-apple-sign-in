export { AppleAuth } from './apple-auth'
export {
  AppleButton,
  APPLE_BUTTON_HEIGHT,
  type IAppleButtonProps,
  type AppleButtonProps,
} from './apple-button'
export { AppleLogo } from './apple-logo'
export { useAppleAuth } from './use-apple-auth'
export {
  AppleAuthError,
  AppleAuthErrorCode,
  EAppleAuthErrorCode,
  isAppleAuthError,
  isCancelledError,
  normalizeAppleError,
  type TAppleAuthErrorCodeValue,
  type AppleAuthErrorCodeValue,
} from './errors'
export { isCancelledResponse, isErrorResponse, isSuccessResponse } from './responses'
export {
  signInWithSupabase,
  type TSupabaseAuthLike,
  type SupabaseAuthLike,
} from './adapters/supabase'
export { signInWithClerk } from './adapters/clerk'
export {
  signInWithFirebase,
  toFirebaseAppleCredential,
  type TFirebaseAppleCredential,
  type FirebaseAppleCredential,
} from './adapters/firebase'
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
  TAppleEventSubscription,
  TAppleRealUserStatus,
  TAppleScope,
  TAppleSignInOptions,
  TAppleUser,
  TAppleWebMode,
  TExpoAppleSignInNativeModule,
  TNativeSignInParams,
  TNativeSignInResult,
  TUseAppleAuthOptions,
  TUseAppleAuthResult,
  AppleAuthConfig,
  AppleAuthErrorResponse,
  AppleAuthResponse,
  AppleAuthSuccessResponse,
  AppleAuthCancelledResponse,
  AppleButtonStyle,
  AppleButtonType,
  AppleCredential,
  AppleCredentialState,
  AppleEventSubscription,
  AppleRealUserStatus,
  AppleScope,
  AppleSignInOptions,
  AppleUser,
  AppleWebMode,
  ExpoAppleSignInNativeModule,
  NativeSignInParams,
  NativeSignInResult,
  UseAppleAuthOptions,
  UseAppleAuthResult,
} from './types'
