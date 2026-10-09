# API

This page lists every export of `expo-apple-sign-in` with its exact signature, grouped by purpose. The package has one entry point, three adapter subpaths, and a config plugin. For explanations and examples, follow the links to the [guides](/guides/usage).

## Entry points

| Import | Contents |
|---|---|
| `expo-apple-sign-in` | Everything on this page. |
| `expo-apple-sign-in/supabase` | `signInWithSupabase`, `TSupabaseAuthLike`, `SupabaseAuthLike`. |
| `expo-apple-sign-in/clerk` | `signInWithClerk`. |
| `expo-apple-sign-in/firebase` | `signInWithFirebase`, `toFirebaseAppleCredential`, `TFirebaseAppleCredential`, `FirebaseAppleCredential`. |
| `expo-apple-sign-in/app.plugin` | The Expo config plugin. Add `"expo-apple-sign-in"` to `plugins` instead of importing it. |

The main entry exports the adapters as well. The subpaths expose the same functions on their own, so a file that talks to one provider imports only that provider's code.

## AppleAuth

`AppleAuth` is an object with these methods. See [Usage](/guides/usage) for the behavior of each one.

```ts
AppleAuth.configure(next: TAppleAuthConfig): void
AppleAuth.getConfig(): TAppleAuthConfig
AppleAuth.isConfigured(): boolean
AppleAuth.isAvailable(): Promise<boolean>
AppleAuth.signIn(options?: TAppleSignInOptions): Promise<TAppleCredential>
AppleAuth.request(options?: TAppleSignInOptions): Promise<TAppleAuthResponse>
AppleAuth.getCurrentCredential(): TAppleCredential | null
AppleAuth.getCredentialState(userId: string): Promise<TAppleCredentialState>
AppleAuth.signOut(): Promise<void>
```

| Method | Description |
|---|---|
| `configure` | Merges `next` into the stored configuration and skips `undefined` values. Call once at startup. Required on Android and web. |
| `getConfig` | Returns a copy of the stored configuration. |
| `isConfigured` | `true` on iOS. On Android and web, `true` when `clientId` and `redirectUri` are both set. |
| `isAvailable` | `true` when the native module is linked (iOS, Android) or a browser document exists (web). |
| `signIn` | Runs the flow. Resolves with the credential. Rejects with `AppleAuthError`, using `ERR_REQUEST_CANCELED` for a cancel. |
| `request` | Runs the same flow and never rejects. Resolves with a `TAppleAuthResponse`. |
| `getCurrentCredential` | Returns the credential of the last successful sign-in from memory, or `null`. |
| `getCredentialState` | On iOS, asks the system. Elsewhere returns `'authorized'` when `userId` matches the last credential and `'unknown'` otherwise. |
| `signOut` | Clears the in-memory credential. Apple has no sign-out API. |

## Hook

```ts
function useAppleAuth(options?: TUseAppleAuthOptions): {
  signIn: () => Promise<TAppleCredential | null>
  signOut: () => Promise<void>
  credential: TAppleCredential | null
  isLoading: boolean
  error: AppleAuthError | null
  isAvailable: boolean
  isConfigured: boolean
}
```

`signIn` resolves with `null` when the person cancels, unless `options.treatCancelAsError` is `true`. See [useAppleAuth hook](/guides/hook).

## Components

```ts
function AppleButton(props: IAppleButtonProps): ReactElement
function AppleLogo(props: { color: string; size?: number; style?: StyleProp<ImageStyle> }): ReactElement
const APPLE_BUTTON_HEIGHT: 48
```

`AppleButton` props are listed in [Apple button](/guides/button#props). `AppleLogo` is described in [AppleLogo](/guides/button#applelogo), with `size` defaulting to `18`.

```ts
interface IAppleButtonProps {
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
```

The meaning and typical causes of each code are in the [Errors guide](/guides/errors#codes).

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

## Types

All types are exported from `expo-apple-sign-in`. Each `T`-prefixed type has an unprefixed public alias that follows Apple terminology.

```ts
type TAppleScope = 'name' | 'email' | 'fullName'

type TAppleButtonStyle = 'black' | 'white' | 'whiteOutline'

type TAppleButtonType = 'signIn' | 'continue' | 'signUp'

type TAppleRealUserStatus = 'unknown' | 'likelyReal' | 'unsupported'

type TAppleCredentialState = 'revoked' | 'authorized' | 'notFound' | 'transferred' | 'unknown'

type TAppleAuthConfig = {
  clientId?: string
  redirectUri?: string
  scopes?: TAppleScope[]
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
}

type TAppleAuthResponse =
  TAppleAuthSuccessResponse | TAppleAuthCancelledResponse | TAppleAuthErrorResponse

type TUseAppleAuthOptions = TAppleAuthConfig & {
  treatCancelAsError?: boolean
}
```

| Alias | Equals |
|---|---|
| `AppleScope` | `TAppleScope` |
| `AppleButtonStyle` | `TAppleButtonStyle` |
| `AppleButtonType` | `TAppleButtonType` |
| `AppleRealUserStatus` | `TAppleRealUserStatus` |
| `AppleCredentialState` | `TAppleCredentialState` |
| `AppleAuthConfig` | `TAppleAuthConfig` |
| `AppleSignInOptions` | `TAppleSignInOptions` |
| `AppleUser` | `TAppleUser` |
| `AppleCredential` | `TAppleCredential` |
| `AppleAuthSuccessResponse` | `TAppleAuthSuccessResponse` |
| `AppleAuthCancelledResponse` | `TAppleAuthCancelledResponse` |
| `AppleAuthErrorResponse` | `TAppleAuthErrorResponse` |
| `AppleAuthResponse` | `TAppleAuthResponse` |
| `UseAppleAuthOptions` | `TUseAppleAuthOptions` |
| `AppleButtonProps` | `IAppleButtonProps` |
| `SupabaseAuthLike` | `TSupabaseAuthLike` |
| `FirebaseAppleCredential` | `TFirebaseAppleCredential` |

Field notes:

- `clientId` is the Services ID. `redirectUri` is an HTTPS URL registered for it. Both are ignored on iOS.
- `nonce` on `TAppleSignInOptions` is raw. The library hashes it and returns the raw value on `TAppleCredential.nonce`.
- `TAppleUser.id` is a stable identifier shared by the apps of one team.
- `TUseAppleAuthOptions.treatCancelAsError` defaults to `false`.
