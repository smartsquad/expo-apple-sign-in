export type TAppleScope = 'name' | 'email' | 'fullName'

export type TAppleButtonStyle = 'black' | 'white' | 'whiteOutline'

export type TAppleButtonType = 'signIn' | 'continue' | 'signUp'

export type TAppleRealUserStatus = 'unknown' | 'likelyReal' | 'unsupported'

export type TAppleCredentialState =
  'revoked' | 'authorized' | 'notFound' | 'transferred' | 'unknown'

/**
 * Configuration shared by every platform.
 *
 * - **iOS** uses the app's Apple App ID / bundle identifier. `clientId` is ignored.
 * - **Android** and **web** use a Services ID (`clientId`) plus an HTTPS `redirectUri`
 *   registered under that Services ID in the Apple Developer portal.
 */
export type TAppleAuthConfig = {
  /**
   * Services ID, for example `com.example.app.service`.
   * Required on Android and web. Unused on iOS.
   */
  clientId?: string
  /**
   * HTTPS redirect URI registered for the Services ID.
   * Required on Android and web. Unused on iOS.
   */
  redirectUri?: string
  /** Default scopes requested at sign-in. Apple may still omit values. */
  scopes?: TAppleScope[]
}

export type TAppleSignInOptions = {
  /**
   * Raw (unhashed) nonce. The library hashes it with SHA-256 before sending
   * it to Apple, and returns the same raw value on the credential so Supabase,
   * Clerk, and Firebase can verify the identity token.
   */
  nonce?: string
  /** Opaque value echoed back by Apple. Generated when omitted. */
  state?: string
  /** Overrides the scopes from {@link AppleAuth.configure}. */
  scopes?: TAppleScope[]
}

export type TAppleUser = {
  /** Stable Apple user identifier. Same across apps from the same team. */
  id: string | null
  email: string | null
  givenName: string | null
  familyName: string | null
}

export type TAppleCredential = {
  /** JWT identity token. Pass this to `signInWithIdToken` / `oauth_token_apple`. */
  identityToken: string
  /** Single-use authorization code. */
  authorizationCode: string | null
  /**
   * Raw nonce that was hashed for Apple. Pass this to Supabase and Firebase.
   * Clerk verifies the token itself and does not need it.
   */
  nonce: string
  state: string | null
  user: TAppleUser
  realUserStatus: TAppleRealUserStatus
}

export type TNativeSignInParams = {
  nonce: string
  state: string
  scopes: string[]
  clientId?: string
  redirectUri?: string
}

export type TNativeSignInResult = {
  identityToken?: string | null
  authorizationCode?: string | null
  user?: string | null
  email?: string | null
  givenName?: string | null
  familyName?: string | null
  state?: string | null
  realUserStatus?: string | null
}

export type TAppleAuthSuccessResponse = {
  type: 'success'
  data: TAppleCredential
}

export type TAppleAuthCancelledResponse = {
  type: 'cancelled'
}

export type TAppleAuthErrorResponse = {
  type: 'error'
  code: string
  message: string
}

export type TAppleAuthResponse =
  TAppleAuthSuccessResponse | TAppleAuthCancelledResponse | TAppleAuthErrorResponse

export type TUseAppleAuthOptions = TAppleAuthConfig & {
  /** When true, user cancellation is stored in `error` and rethrown. Default: false. */
  treatCancelAsError?: boolean
}

export type TExpoAppleSignInNativeModule = {
  isAvailable: () => boolean
  signIn: (params: TNativeSignInParams) => Promise<TNativeSignInResult>
  getCredentialState: (userId: string) => Promise<string> | string
}

/** Public aliases so the package API matches Apple terminology. */
export type AppleScope = TAppleScope
export type AppleButtonStyle = TAppleButtonStyle
export type AppleButtonType = TAppleButtonType
export type AppleRealUserStatus = TAppleRealUserStatus
export type AppleCredentialState = TAppleCredentialState
export type AppleAuthConfig = TAppleAuthConfig
export type AppleSignInOptions = TAppleSignInOptions
export type AppleUser = TAppleUser
export type AppleCredential = TAppleCredential
export type NativeSignInParams = TNativeSignInParams
export type NativeSignInResult = TNativeSignInResult
export type AppleAuthSuccessResponse = TAppleAuthSuccessResponse
export type AppleAuthCancelledResponse = TAppleAuthCancelledResponse
export type AppleAuthErrorResponse = TAppleAuthErrorResponse
export type AppleAuthResponse = TAppleAuthResponse
export type UseAppleAuthOptions = TUseAppleAuthOptions
export type ExpoAppleSignInNativeModule = TExpoAppleSignInNativeModule
