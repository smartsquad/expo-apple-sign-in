# API

This page lists every export of `expo-apple-sign-in` with its exact signature, grouped by purpose. The package has one entry point, three adapter subpaths, a server subpath, and a config plugin. For explanations and examples, follow the links to the [guides](/guides/usage).

## Entry points

| Import | Contents |
|---|---|
| `expo-apple-sign-in` | Everything on this page. |
| `expo-apple-sign-in/supabase` | `signInWithSupabase`, `TSupabaseAuthLike`, `SupabaseAuthLike`. |
| `expo-apple-sign-in/clerk` | `signInWithClerk`. |
| `expo-apple-sign-in/firebase` | `signInWithFirebase`, `toFirebaseAppleCredential`, `TFirebaseAppleCredential`, `FirebaseAppleCredential`. |
| `expo-apple-sign-in/server` | `handleAppleWebRedirect`, `webRedirectBridgeDocument`, `EWebRedirectStorage`. Answers Apple's web POST in redirect mode. It has no runtime imports and no React or React Native code, so server code can load it. See [Server](#server). |
| `expo-apple-sign-in/app.plugin` | The Expo config plugin. Add `"expo-apple-sign-in"` to `plugins` instead of importing it. |

The main entry exports the adapters as well. The subpaths expose the same functions on their own, so a file that talks to one provider imports only that provider's code.

## AppleAuth

`AppleAuth` is an object with these methods. See [Usage](/guides/usage) for the behavior of each one.

```ts
AppleAuth.configure(next: TAppleAuthConfig): void
AppleAuth.getConfig(): TAppleAuthConfig
AppleAuth.isConfigured(): boolean
AppleAuth.isAvailable(): Promise<boolean>
AppleAuth.hasWebRedirectResult(): boolean
AppleAuth.signIn(options?: TAppleSignInOptions): Promise<TAppleCredential>
AppleAuth.request(options?: TAppleSignInOptions): Promise<TAppleAuthResponse>
AppleAuth.getCurrentCredential(): TAppleCredential | null
AppleAuth.getCredentialState(userId: string): Promise<TAppleCredentialState>
AppleAuth.addRevokeListener(listener: () => void): TAppleEventSubscription
AppleAuth.signOut(): Promise<void>
```

| Method | Description |
|---|---|
| `configure` | Merges `next` into the stored configuration and skips `undefined` values. Call once at startup. Required on Android and web. On web, `webMode` selects `'popup'` (default), `'redirect'`, or `'auto'`. |
| `getConfig` | Returns a copy of the stored configuration. |
| `isConfigured` | `true` on iOS. On Android and web, `true` when `clientId` and `redirectUri` are both set. |
| `isAvailable` | On iOS and Android, asks the native module, which answers `true` whenever it is linked, and resolves `false` when the module is missing or the call throws. On web, resolves `true` when a browser document exists. |
| `signIn` | Runs the flow. Resolves with the credential. Rejects with `AppleAuthError`, using `ERR_REQUEST_CANCELED` for a cancel. On iOS and Android, a call made while another sign-in is pending rejects with `ERR_REQUEST_FAILED`. |
| `request` | Runs the same flow and never rejects. Resolves with a `TAppleAuthResponse`. |
| `hasWebRedirectResult` | Web only. `true` while a result from Apple's redirect waits and nothing has claimed it. `AppleButton`, `useAppleAuth`, `signIn` and `request` claim it. Call `AppleAuth.signIn()` or an adapter when it is `true` and the page renders neither `AppleButton` nor `useAppleAuth`. |
| `getCurrentCredential` | Returns the credential of the last successful sign-in from memory, or `null`. After a web redirect it also returns the credential that came back from Apple. |
| `getCredentialState` | On iOS, asks Apple and resolves `'authorized'`, `'revoked'`, `'notFound'`, `'transferred'`, or `'unknown'`. Resolves `'unknown'` on Android and web, and on iOS when the native module is missing. |
| `addRevokeListener` | Calls `listener` when the person revokes Sign in with Apple for your app. iOS only. On Android and web it returns a subscription whose `remove` does nothing. Call `remove()` on unmount. |
| `signOut` | Clears the in-memory credential. Apple has no sign-out API. |

## Hook

```ts
function useAppleAuth(options?: TUseAppleAuthOptions): TUseAppleAuthResult

type TUseAppleAuthResult = {
  signIn: (options?: TAppleSignInOptions) => Promise<TAppleCredential | null>
  signOut: () => Promise<void>
  credential: TAppleCredential | null
  isLoading: boolean
  error: AppleAuthError | null
  isAvailable: boolean
  isConfigured: boolean
}
```

`signIn` passes its `options` to `AppleAuth.signIn` and resolves with `null` when the person cancels, unless the hook's `treatCancelAsError` option is `true`. On iOS the hook also clears `credential` when Apple revokes it. After a web redirect returns to the page, the hook calls `signIn` once on mount and sets `credential` or `error`. See [useAppleAuth hook](/guides/hook).

## Components

```ts
function AppleButton(props: IAppleButtonProps): ReactElement
function AppleLogo(props: { color: string; size?: number; style?: StyleProp<ImageStyle> }): ReactElement
const APPLE_BUTTON_HEIGHT: 48
```

`AppleButton` props are listed in [Apple button](/guides/button#props). `AppleLogo` is described in [AppleLogo](/guides/button#applelogo), with `size` defaulting to `18`.

```ts
interface IAppleButtonProps
  extends Omit<PressableProps, 'onPress' | 'style' | 'disabled' | 'children'> {
  onPress?: () => void
  onSuccess?: (credential: TAppleCredential) => void
  onError?: (error: AppleAuthError) => void
  onCancel?: () => void
  buttonStyle?: TAppleButtonStyle
  buttonType?: TAppleButtonType
  label?: string
  cornerRadius?: number
  height?: number
  width?: number | `${number}%`
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  children?: ReactNode
}

type AppleButtonProps = IAppleButtonProps
```

Every other `Pressable` prop, such as `testID`, `accessibilityHint`, or `onLongPress`, is passed through to the underlying `Pressable`. `accessibilityLabel` defaults to the label text. The button always sets `accessibilityRole` to `'button'` and builds `accessibilityState` from `disabled` and its own busy flag, so values you pass for those two props are replaced.

## Nonce helpers

```ts
function generateNonce(byteLength?: number): string
function sha256Hex(message: string): string
```

`generateNonce` returns `byteLength` random bytes (default `32`) as lowercase hex. The bytes come from `crypto.getRandomValues` when the runtime has it and from Expo's native `uuidv4` function on iOS and Android otherwise. If neither exists, it throws an `AppleAuthError` with `ERR_REQUEST_FAILED`, and `AppleAuth.signIn` returns that code unless you pass both `nonce` and `state`. `sha256Hex` returns the SHA-256 digest of a string as lowercase hex, without `expo-crypto`. `AppleAuth.signIn` already hashes the nonce for you, so call `sha256Hex` only to reproduce the digest, for example in a test.

## Response helpers

```ts
function isSuccessResponse(response: TAppleAuthResponse): response is TAppleAuthSuccessResponse
function isCancelledResponse(response: TAppleAuthResponse): response is TAppleAuthCancelledResponse
function isErrorResponse(response: TAppleAuthResponse): response is TAppleAuthErrorResponse
```

## Errors

```ts
class AppleAuthError extends Error {
  readonly code: string
  readonly cause?: unknown
  constructor(code: string, message: string, cause?: unknown)
}

function isAppleAuthError(error: unknown): error is AppleAuthError
function isCancelledError(error: unknown): boolean
function normalizeAppleError(error: unknown): AppleAuthError

const EAppleAuthErrorCode: {
  readonly Canceled: 'ERR_REQUEST_CANCELED'
  readonly Failed: 'ERR_REQUEST_FAILED'
  readonly NotConfigured: 'ERR_NOT_CONFIGURED'
  readonly NotAvailable: 'ERR_NOT_AVAILABLE'
  readonly MissingIdentityToken: 'ERR_MISSING_IDENTITY_TOKEN'
  readonly InvalidResponse: 'ERR_INVALID_RESPONSE'
  readonly Unknown: 'ERR_REQUEST_UNKNOWN'
}

const AppleAuthErrorCode: typeof EAppleAuthErrorCode

type TAppleAuthErrorCodeValue = (typeof EAppleAuthErrorCode)[keyof typeof EAppleAuthErrorCode]
type AppleAuthErrorCodeValue = TAppleAuthErrorCodeValue
```

`TAppleAuthErrorCodeValue` is the union of the seven code strings. `AppleAuthError.code` stays typed as `string`, so compare it against `EAppleAuthErrorCode` members. The meaning and typical causes of each code are in the [Errors guide](/guides/errors#codes).

## Adapters

Adapters call `AppleAuth.signIn(options)` themselves, then pass the result to a provider. Call them from `onPress`, never from the `onSuccess` of `AppleButton`.

```ts
function signInWithSupabase(
  client: TSupabaseAuthLike,
  options?: TAppleSignInOptions
): Promise<{ credential: TAppleCredential; data: unknown }>

function signInWithClerk(
  params: {
    signIn: TClerkResource
    signUp: TClerkResource
    setActive?: (params: { session: string }) => Promise<unknown>
  },
  options?: TAppleSignInOptions
): Promise<{ credential: TAppleCredential; createdSessionId: string | null }>

function signInWithFirebase(
  signInWithCredential: (credential: TFirebaseAppleCredential) => Promise<unknown>,
  options?: TAppleSignInOptions
): Promise<{ credential: TAppleCredential; data: unknown }>

function toFirebaseAppleCredential(credential: TAppleCredential): TFirebaseAppleCredential
```

```ts
type TSupabaseAuthLike = {
  auth: {
    signInWithIdToken: (credentials: {
      provider: 'apple'
      token: string
      nonce?: string
    }) => Promise<unknown>
  }
}

type TFirebaseAppleCredential = {
  providerId: 'apple.com'
  token: string
  rawNonce: string
}

type TClerkResource = {
  create: (params: Record<string, unknown>) => Promise<unknown>
  createdSessionId?: string | null
  firstFactorVerification?: { status?: string | null }
}
```

`TClerkResource` is the structural shape that `signInWithClerk` accepts for `signIn` and `signUp`. It is not exported from the package. `SupabaseAuthLike` and `FirebaseAppleCredential` are public aliases of the `T`-prefixed types.

Each adapter has its own page: [Supabase](/providers/supabase), [Clerk](/providers/clerk), [Firebase](/providers/firebase).

## Server

`expo-apple-sign-in/server` answers the POST that Apple sends to `redirectUri` in web redirect mode. Import it in server code only.

```ts
function handleAppleWebRedirect(request: Request): Promise<Response>
function webRedirectBridgeDocument(formBody: string): string

const EWebRedirectStorage: {
  readonly pending: 'expo-apple-sign-in.web-pending'
  readonly result: 'expo-apple-sign-in.web-result'
}
```

`handleAppleWebRedirect` returns `405` with `Allow: POST` for any other method. For a POST it returns an HTML page with `Cache-Control: no-store`, `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff`. The page stores `id_token`, `code`, `state`, `user` and `error` in `sessionStorage` under `EWebRedirectStorage.result` and calls `location.replace` with the stored `returnTo`. It accepts `returnTo` only when it starts with `/` and the second character is not `/` or `\`. Otherwise it goes to `/`.

`webRedirectBridgeDocument` returns the same HTML for servers that do not use Fetch `Request` and `Response`. Pass it the raw `application/x-www-form-urlencoded` body and send the result as `text/html` with `Cache-Control: no-store`. Nothing in the entry logs, and the route must not log the body either, because it carries the identity token and the authorization code. [Web](/setup/web#answer-apple-s-post) shows an Expo Router route.

## Types

All types are exported from `expo-apple-sign-in`. Each `T`-prefixed type has an unprefixed public alias that follows Apple terminology.

```ts
type TAppleScope = 'name' | 'email' | 'fullName'

type TAppleButtonStyle = 'black' | 'white' | 'whiteOutline'

type TAppleButtonType = 'signIn' | 'continue' | 'signUp'

type TAppleRealUserStatus = 'unknown' | 'likelyReal' | 'unsupported'

type TAppleCredentialState = 'revoked' | 'authorized' | 'notFound' | 'transferred' | 'unknown'

type TAppleWebMode = 'popup' | 'redirect' | 'auto'

type TAppleAuthConfig = {
  clientId?: string
  redirectUri?: string
  scopes?: TAppleScope[]
  webMode?: TAppleWebMode
}

type TAppleSignInOptions = {
  nonce?: string
  state?: string
  scopes?: TAppleScope[]
}

type TAppleUser = {
  id: string | null
  email: string | null
  givenName: string | null
  familyName: string | null
  middleName: string | null
  namePrefix: string | null
  nameSuffix: string | null
  nickname: string | null
}

type TAppleCredential = {
  identityToken: string
  authorizationCode: string | null
  nonce: string
  state: string | null
  user: TAppleUser
  realUserStatus: TAppleRealUserStatus
}

type TAppleAuthSuccessResponse = {
  type: 'success'
  data: TAppleCredential
}

type TAppleAuthCancelledResponse = {
  type: 'cancelled'
}

type TAppleAuthErrorResponse = {
  type: 'error'
  code: string
  message: string
  cause?: unknown
}

type TAppleAuthResponse =
  TAppleAuthSuccessResponse | TAppleAuthCancelledResponse | TAppleAuthErrorResponse

type TUseAppleAuthOptions = TAppleAuthConfig & {
  treatCancelAsError?: boolean
}

type TAppleEventSubscription = { remove(): void }

type TNativeSignInParams = {
  nonce: string
  state: string
  scopes: string[]
  clientId?: string
  redirectUri?: string
}

type TNativeSignInResult = {
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

type TExpoAppleSignInNativeModule = {
  isAvailable: () => boolean
  signIn: (params: TNativeSignInParams) => Promise<TNativeSignInResult>
  getCredentialState: (userId: string) => Promise<string> | string
  addListener?: (eventName: 'credentialRevoked', listener: () => void) => TAppleEventSubscription
}
```

| Alias | Equals |
|---|---|
| `AppleScope` | `TAppleScope` |
| `AppleButtonStyle` | `TAppleButtonStyle` |
| `AppleButtonType` | `TAppleButtonType` |
| `AppleRealUserStatus` | `TAppleRealUserStatus` |
| `AppleCredentialState` | `TAppleCredentialState` |
| `AppleWebMode` | `TAppleWebMode` |
| `AppleAuthConfig` | `TAppleAuthConfig` |
| `AppleSignInOptions` | `TAppleSignInOptions` |
| `AppleUser` | `TAppleUser` |
| `AppleCredential` | `TAppleCredential` |
| `AppleAuthSuccessResponse` | `TAppleAuthSuccessResponse` |
| `AppleAuthCancelledResponse` | `TAppleAuthCancelledResponse` |
| `AppleAuthErrorResponse` | `TAppleAuthErrorResponse` |
| `AppleAuthResponse` | `TAppleAuthResponse` |
| `UseAppleAuthOptions` | `TUseAppleAuthOptions` |
| `UseAppleAuthResult` | `TUseAppleAuthResult` |
| `AppleEventSubscription` | `TAppleEventSubscription` |
| `NativeSignInParams` | `TNativeSignInParams` |
| `NativeSignInResult` | `TNativeSignInResult` |
| `ExpoAppleSignInNativeModule` | `TExpoAppleSignInNativeModule` |
| `AppleAuthErrorCodeValue` | `TAppleAuthErrorCodeValue` |
| `AppleButtonProps` | `IAppleButtonProps` |
| `SupabaseAuthLike` | `TSupabaseAuthLike` |
| `FirebaseAppleCredential` | `TFirebaseAppleCredential` |

Field notes:

- `clientId` is the Services ID. `redirectUri` is an HTTPS URL registered for it. Both are ignored on iOS.
- `webMode` applies on web only and defaults to `'popup'`. `'redirect'` sends the tab to Apple and needs a server route that answers Apple's POST at `redirectUri`. `'auto'` uses redirect on Android, iPhone, iPad and iPod browsers and on iPadOS Safari, and popup elsewhere. See [Web](/setup/web#choose-a-web-mode).
- `nonce` on `TAppleSignInOptions` is raw. The library hashes it and returns the raw value on `TAppleCredential.nonce`.
- `TAppleUser.id` is a stable identifier shared by the apps of one team.
- Apple sends name fields on the first authorization only. `middleName`, `namePrefix`, `nameSuffix`, and `nickname` come from iOS alone. Android and web return `null` for them because Apple's web flow sends only the first and last name.
- `cause` on `TAppleAuthErrorResponse` is the error the library wrapped, when there was one.
- `TNativeSignInParams`, `TNativeSignInResult`, and `TExpoAppleSignInNativeModule` describe the contract between `AppleAuth` and the native module. `TNativeSignInParams.nonce` is already hashed. The web adapter uses the same params and result types. `AppleAuth` calls the native module for you.
- `addListener` on `TExpoAppleSignInNativeModule` is optional because older native builds may lack it. Only the iOS module emits `credentialRevoked`.
- `TUseAppleAuthOptions.treatCancelAsError` defaults to `false`.
