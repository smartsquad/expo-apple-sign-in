import type { AppleAuthError } from './errors'

/** Scope requested from Apple. `fullName` is treated the same as `name`. */
export type TAppleScope = 'name' | 'email' | 'fullName'

/** Button colors from Apple's Human Interface Guidelines. */
export type TAppleButtonStyle = 'black' | 'white' | 'whiteOutline'

/** Selects the button label: Sign in, Continue, or Sign up with Apple. */
export type TAppleButtonType = 'signIn' | 'continue' | 'signUp'

/** Apple's real-user indicator. Only iOS reports it; Android and web return `'unknown'`. */
export type TAppleRealUserStatus = 'unknown' | 'likelyReal' | 'unsupported'

/** Credential state resolved by `AppleAuth.getCredentialState`. */
export type TAppleCredentialState =
  'revoked' | 'authorized' | 'notFound' | 'transferred' | 'unknown'

/**
 * Configuration shared by every platform. iOS uses the app's bundle identifier, so `clientId` is
 * ignored there. Android and web use a Services ID (`clientId`) and an HTTPS `redirectUri`
 * registered under that Services ID in the Apple Developer portal. On web the `redirectUri` origin
 * must match the page origin exactly; a subdomain is a different origin from the apex domain.
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

/** Per-call options for `AppleAuth.signIn` and `AppleAuth.request`. */
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

/**
 * Apple user profile. Apple returns name fields on the first authorization only. Only iOS returns
 * `middleName`, `namePrefix`, `nameSuffix`, and `nickname`; Apple's web flow, used on Android and
 * web, sends only first and last name.
 */
export type TAppleUser = {
  /** Stable Apple user identifier. Same across apps from the same team. */
  id: string | null
  email: string | null
  givenName: string | null
  familyName: string | null
  middleName: string | null
  namePrefix: string | null
  nameSuffix: string | null
  nickname: string | null
}

/** Credential returned by `AppleAuth.signIn`, with the same shape on iOS, Android, and web. */
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

/** Parameters sent to the native module and the web adapter. `nonce` is already SHA-256 hashed. */
export type TNativeSignInParams = {
  nonce: string
  state: string
  scopes: string[]
  clientId?: string
  redirectUri?: string
}

/** Raw sign-in result from the native module or the web adapter, before normalization. */
export type TNativeSignInResult = {
  identityToken?: string | null
  authorizationCode?: string | null
  user?: string | null
  email?: string | null
  givenName?: string | null
  familyName?: string | null
  middleName?: string | null
  namePrefix?: string | null
  nameSuffix?: string | null
  nickname?: string | null
  state?: string | null
  realUserStatus?: string | null
}

/** `AppleAuth.request` result when sign-in succeeds. */
export type TAppleAuthSuccessResponse = {
  type: 'success'
  data: TAppleCredential
}

/** `AppleAuth.request` result when the user cancels. */
export type TAppleAuthCancelledResponse = {
  type: 'cancelled'
}

/** `AppleAuth.request` result when sign-in fails. `code` is an `ERR_*` string. */
export type TAppleAuthErrorResponse = {
  type: 'error'
  code: string
  message: string
}

/** Result of `AppleAuth.request`, which never throws for cancel or failure. */
export type TAppleAuthResponse =
  TAppleAuthSuccessResponse | TAppleAuthCancelledResponse | TAppleAuthErrorResponse

/** Options for `useAppleAuth`. The config fields are passed to `AppleAuth.configure`. */
export type TUseAppleAuthOptions = TAppleAuthConfig & {
  /** When true, user cancellation is stored in `error` and rethrown. Default: false. */
  treatCancelAsError?: boolean
}

/** Object returned by `useAppleAuth`. */
export type TUseAppleAuthResult = {
  /**
   * Starts a sign-in. Resolves with the credential, or with null when the user cancels and
   * `treatCancelAsError` is false.
   */
  signIn: (options?: TAppleSignInOptions) => Promise<TAppleCredential | null>
  /** Clears the credential and the error. */
  signOut: () => Promise<void>
  /** The last credential, or null. */
  credential: TAppleCredential | null
  /** True while a sign-in runs. */
  isLoading: boolean
  /** The last sign-in error, or null. */
  error: AppleAuthError | null
  /** False until `AppleAuth.isAvailable()` resolves true. */
  isAvailable: boolean
  /**
   * `AppleAuth.isConfigured()`, kept current across `AppleAuth.configure` calls made by this
   * hook or anywhere else in the app.
   */
  isConfigured: boolean
}

/** Subscription returned by `AppleAuth.addRevokeListener`. */
export type TAppleEventSubscription = { remove(): void }

/** Contract of the `ExpoAppleSignIn` native module on iOS and Android. */
export type TExpoAppleSignInNativeModule = {
  isAvailable: () => boolean
  signIn: (params: TNativeSignInParams) => Promise<TNativeSignInResult>
  getCredentialState: (userId: string) => Promise<string> | string
  /** Only iOS emits `credentialRevoked`. Optional because older native builds may lack it. */
  addListener?: (eventName: 'credentialRevoked', listener: () => void) => TAppleEventSubscription
}

/** Public aliases so the package API matches Apple terminology. */

/** Alias of {@link TAppleScope}. */
export type AppleScope = TAppleScope

/** Alias of {@link TAppleButtonStyle}. */
export type AppleButtonStyle = TAppleButtonStyle

/** Alias of {@link TAppleButtonType}. */
export type AppleButtonType = TAppleButtonType

/** Alias of {@link TAppleRealUserStatus}. */
export type AppleRealUserStatus = TAppleRealUserStatus

/** Alias of {@link TAppleCredentialState}. */
export type AppleCredentialState = TAppleCredentialState

/** Alias of {@link TAppleAuthConfig}. */
export type AppleAuthConfig = TAppleAuthConfig

/** Alias of {@link TAppleSignInOptions}. */
export type AppleSignInOptions = TAppleSignInOptions

/** Alias of {@link TAppleUser}. */
export type AppleUser = TAppleUser

/** Alias of {@link TAppleCredential}. */
export type AppleCredential = TAppleCredential

/** Alias of {@link TNativeSignInParams}. */
export type NativeSignInParams = TNativeSignInParams

/** Alias of {@link TNativeSignInResult}. */
export type NativeSignInResult = TNativeSignInResult

/** Alias of {@link TAppleAuthSuccessResponse}. */
export type AppleAuthSuccessResponse = TAppleAuthSuccessResponse

/** Alias of {@link TAppleAuthCancelledResponse}. */
export type AppleAuthCancelledResponse = TAppleAuthCancelledResponse

/** Alias of {@link TAppleAuthErrorResponse}. */
export type AppleAuthErrorResponse = TAppleAuthErrorResponse

/** Alias of {@link TAppleAuthResponse}. */
export type AppleAuthResponse = TAppleAuthResponse

/** Alias of {@link TUseAppleAuthOptions}. */
export type UseAppleAuthOptions = TUseAppleAuthOptions

/** Alias of {@link TUseAppleAuthResult}. */
export type UseAppleAuthResult = TUseAppleAuthResult

/** Alias of {@link TAppleEventSubscription}. */
export type AppleEventSubscription = TAppleEventSubscription

/** Alias of {@link TExpoAppleSignInNativeModule}. */
export type ExpoAppleSignInNativeModule = TExpoAppleSignInNativeModule
