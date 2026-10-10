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
  ExpoAppleSignInNativeModule,
  NativeSignInParams,
  NativeSignInResult,
  UseAppleAuthOptions,
  UseAppleAuthResult,
} from './types'
