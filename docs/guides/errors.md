# Errors

Every failure in `expo-apple-sign-in` reaches your code as an `AppleAuthError` with a stable `code`, whichever platform produced it. The iOS module, the Android module, and the web flow report errors differently, and the JavaScript layer converts them into the same seven codes, so one `switch` statement covers all three platforms. This page lists the codes, the fields of the error, the helper functions, and a pattern for handling the result.

## Codes

The codes are available at runtime as `EAppleAuthErrorCode` (also exported as `AppleAuthErrorCode`), for example `EAppleAuthErrorCode.Canceled`. The type `TAppleAuthErrorCodeValue` (alias `AppleAuthErrorCodeValue`) is the union of the seven code strings.

| Constant | Code | Meaning | Typical cause |
|---|---|---|---|
| `Canceled` | `ERR_REQUEST_CANCELED` | The person dismissed the sign-in. | iOS: the sheet was closed. Android: the close button or the system back action was used, the activity was destroyed before a result arrived, or the form posted to the redirect lacked `state` or carried none of `id_token`, `code`, and `user`. Web: Apple JS reported `popup_closed_by_user`, `user_cancelled_authorize`, or another code that contains `cancel` or `closed`. |
| `Failed` | `ERR_REQUEST_FAILED` | The authorization attempt failed. | iOS: the system reported `failed`, `notHandled`, `notInteractive`, or `matchedExcludedCredential`, or, on SDKs that declare them, `credentialImport`, `credentialExport`, `preferSignInWithApple`, or `deviceNotConfiguredForPasskeyCreation`. iOS also uses this code when no active window was available to present the sheet. iOS and Android: a sign-in was already running, and the message says that a Sign in with Apple request is already in progress. Android: no application context was available. Web: the browser blocked the popup (`popup_blocked_by_browser`), and the message asks you to call `signIn` from a click handler. Any platform: no secure random source was available for the nonce or state. |
| `NotConfigured` | `ERR_NOT_CONFIGURED` | Required configuration is missing or invalid. | Android and web: `clientId` or `redirectUri` was not set through `AppleAuth.configure`. Web: `redirectUri` is not an absolute URL, or its origin differs from the page origin. |
| `NotAvailable` | `ERR_NOT_AVAILABLE` | Sign in with Apple cannot run on this device. | iOS and Android: the `ExpoAppleSignIn` native module is not linked (Expo Go, or a build made before the plugin was added). Web: there is no browser document, the Apple JS script failed to load, or it did not initialize. After a failed load, the next sign-in loads the script again. |
| `MissingIdentityToken` | `ERR_MISSING_IDENTITY_TOKEN` | The result contained no identity token. | The native module or the Apple JS response returned no `id_token`. The error message names a cancel or a misconfigured Services ID or App ID as likely reasons. |
| `InvalidResponse` | `ERR_INVALID_RESPONSE` | Apple's response was not usable. | iOS: the system reported `invalidResponse`, or returned a credential of an unexpected type. Android: the returned `state` differs from the one that was sent, or the form data posted to the redirect could not be read. |
| `Unknown` | `ERR_REQUEST_UNKNOWN` | The failure matches no other code. | iOS: `ASAuthorizationError.unknown`, a code added by a later SDK, or an error that is not an `ASAuthorizationError`. Web: Apple JS rejected with a code the library does not map, and the message reads `Apple sign-in failed: <code>`. Any platform: an error with no recognizable code is normalized to this one. |

## AppleAuthError

`AppleAuthError` extends `Error`. Its `name` is `'AppleAuthError'`, and it adds these fields.

| Field | Type | Description |
|---|---|---|
| `code` | `string` | One of the codes above. |
| `message` | `string` | Human-readable description. |
| `cause` | `unknown` | The original error when the library wrapped one: a native rejection, an Apple JS SDK error, or any other thrown value. `undefined` when the library raised the error itself. |

`AppleAuth.request` returns the same value as `cause` on its error response, and the `AppleAuthError` thrown by `AppleAuth.signIn` carries it too.

The constructor signature is `new AppleAuthError(code: string, message: string, cause?: unknown)`.

## Helpers

`isAppleAuthError(error)` is a type guard for `AppleAuthError`, based on `instanceof`.

`isCancelledError(error)` returns `true` for a cancel. For an `AppleAuthError` it compares the code with `ERR_REQUEST_CANCELED`. For any other object with a `code` property it also accepts `ERR_CANCELED` and `1001` as alternative cancel codes.

`normalizeAppleError(error)` converts anything into an `AppleAuthError`. It returns an existing `AppleAuthError` unchanged. For other objects, it applies these rules in order:

1. If the `code`, `name`, or `message` text contains "cancel" (case-insensitive), the result has the code `ERR_REQUEST_CANCELED`.
2. If `code` is a string that starts with `ERR_`, the result keeps that code and message.
3. If the message has the shape `ERR_SOMETHING: text`, the code and text are split apart. This is the older Android form, still parsed as a fallback for errors that arrive without a `code`.
4. Otherwise the result has the code `ERR_REQUEST_UNKNOWN`.

The same function runs inside `AppleAuth.signIn`, `AppleAuth.request`, the [hook](/guides/hook), and the [button](/guides/button), so errors you receive from them already carry a normalized code.

## Handle errors

```ts [lib/safe-sign-in.ts]
import { AppleAuth, EAppleAuthErrorCode, isAppleAuthError, isCancelledError } from 'expo-apple-sign-in'
import type { TAppleCredential } from 'expo-apple-sign-in'

export async function signInOrExplain(): Promise<TAppleCredential | null> {
  try {
    return await AppleAuth.signIn()
  } catch (error) {
    if (isCancelledError(error)) {
      return null
    }

    if (isAppleAuthError(error)) {
      switch (error.code) {
        case EAppleAuthErrorCode.NotConfigured:
          console.warn('Set clientId and redirectUri with AppleAuth.configure.')
          break
        case EAppleAuthErrorCode.NotAvailable:
          console.warn('Sign in with Apple is not available here. Use a development build.')
          break
        default:
          console.warn(`${error.code}: ${error.message}`)
      }
    }

    throw error
  }
}
```

If you prefer not to catch exceptions, `AppleAuth.request()` returns the same information as a value. See [request and signIn](/guides/usage#request-and-signin). For fixes to the problems that cause these codes, see [Troubleshooting](/reference/troubleshooting).
