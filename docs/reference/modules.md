# Native modules

`expo-apple-sign-in` ships one native module named `ExpoAppleSignIn` for iOS and one for Android, both written against Expo Modules 2.0. The module is small. It exposes three functions to JavaScript, plus a `credentialRevoked` event on iOS, and leaves every decision about nonces, defaults, and error normalization to the JavaScript layer, so the nonce handling, defaults, and error codes described in [Usage](/guides/usage) are the same on every platform. This page describes what each module exposes, what it returns, and how its errors become the [codes](/guides/errors#codes) that your code receives. Web has no native module: it loads Apple's JavaScript SDK in a popup instead.

## How JavaScript finds the module

The JavaScript layer looks for `globalThis.expo.modules.ExpoAppleSignIn` first and falls back to `requireOptionalNativeModule('ExpoAppleSignIn')` from `expo`. When neither exists, `AppleAuth.isAvailable()` returns `false` and `AppleAuth.signIn()` rejects with `ERR_NOT_AVAILABLE`. That is what happens in Expo Go, which cannot load custom native code. A development build that includes the config plugin loads the module. See [Expo config](/setup/expo).

## Exposed functions

Both platforms declare the same three functions. Only the iOS module declares the `credentialRevoked` event.

| Function | Parameters | Returns | iOS | Android |
|---|---|---|---|---|
| `isAvailable` | none | `boolean` | `true`. The podspec targets iOS 16.4, above the iOS 13 minimum of Sign in with Apple. | `true`. |
| `signIn` | `SignInOptions` record | `AppleCredentialRecord` record | Presents the system Sign in with Apple sheet. | Opens an in-app WebView activity on Apple's authorize page. |
| `getCredentialState` | `userId: string` | `string` | Asks `ASAuthorizationAppleIDProvider` and returns `revoked`, `authorized`, `transferred`, or `notFound`, or `unknown` for a state the library does not recognize. Never rejects. | Returns `unknown`. |

`AppleAuth.getCredentialState` calls the native function on iOS only, so the Android value is never read by the library.

The two records have the same fields on both platforms.

| Record | Fields |
|---|---|
| `SignInOptions` | `nonce` (string, optional), `state` (string, optional), `scopes` (string list, default `fullName` and `email`), `clientId` (string, optional), `redirectUri` (string, optional) |
| `AppleCredentialRecord` | `identityToken`, `authorizationCode`, `user`, `email`, `givenName`, `familyName`, `middleName`, `namePrefix`, `nameSuffix`, `nickname`, `state` (all optional strings), `realUserStatus` (string, default `unknown`) |

The JavaScript layer sends the already hashed nonce in `SignInOptions.nonce`, generates `state` when you did not pass one, and turns the returned record into the [credential](/guides/usage#what-the-credential-contains). It trims strings and drops empty values, rejects a record without `identityToken` with `ERR_MISSING_IDENTITY_TOKEN`, and fills `user.id` and `user.email` from the identity token when the platform left them empty.

## Modules 2.0 declarations

Native code uses ordinary Swift and Kotlin with the `@ExpoModule`, `@JS`, and `@Record` annotations, plus `@Event` on iOS, instead of the Modules 1.0 `ModuleDefinition` DSL.

```swift [ios/ExpoAppleSignInModule.swift]
@ExpoModule("ExpoAppleSignIn")
public class ExpoAppleSignInModule: Module {
  @Event
  var onCredentialRevoked: () -> Void

  @JS
  func isAvailable() -> Bool {
    true
  }

  @JS
  @MainActor
  func signIn(options: SignInOptions) async throws -> AppleCredentialRecord {
    try await AppleSignInSession.shared.signIn(options: options)
  }
}
```

```kotlin [android/src/main/java/expo/modules/applesignin/ExpoAppleSignInModule.kt]
@ExpoModule("ExpoAppleSignIn")
object ExpoAppleSignInModule : Module() {
  @JS
  fun isAvailable(): Boolean = true

  @JS
  suspend fun signIn(options: SignInOptions): AppleCredentialRecord {
    return AppleSignInCoordinator.signIn(options)
  }
}
```

The excerpts omit `getCredentialState`, and the iOS excerpt also omits the methods that start and stop the revoke observer. Android turns on the Modules 2.0 compiler with `expoModule { v2 true }` in `android/build.gradle`, and the annotations come from `io.github.expo.modules.v2`. `expo-module.config.json` lists `ExpoAppleSignInModule` as the Apple module and declares the platforms `apple`, `android`, and `web`. On Android, expo-modules-core loads a Modules 2.0 module by reading its static `INSTANCE` field through reflection, and the Modules 2.0 runtime looks up its own Java classes and fields by name from native code. R8 cannot see either kind of access, so `android/proguard-rules.pro` ships consumer R8 rules that keep the `expo.modules.applesignin`, `io.github.expo.modules.v2`, and `io.github.expo.kolibri` packages. Release builds with minification turned on need no extra ProGuard configuration.

## iOS

The iOS module runs `AuthenticationServices`. For each call it creates an `ASAuthorizationAppleIDProvider` request with the `login` operation, the requested scopes, the nonce, and the state, and presents it over the key window of the app. The scope values `name` and `fullName` map to the full name scope, `email` maps to the email scope, and any other value is ignored.

Only one sign-in can run at a time. A second call while the first is pending fails with `ERR_REQUEST_FAILED` and a message that contains `A Sign in with Apple request is already in progress`. A call made when no window is available to present the sheet fails with the same code.

On success the module reads the identity token and the authorization code as UTF-8 strings, along with the user identifier, the email, the state, and the user detection status. From the full name it reads the given name, family name, middle name, name prefix, name suffix, and nickname, which Apple sends on the first authorization only. The status maps to `likelyReal`, `unsupported`, or `unknown`.

The `credentialRevoked` event follows Apple's `ASAuthorizationAppleIDProvider.credentialRevokedNotification`. When JavaScript starts listening for the event, the module adds an observer for that notification on the main queue and emits `credentialRevoked` each time it arrives. The module removes the observer when JavaScript stops listening and when the module is destroyed. [`AppleAuth.addRevokeListener`](/guides/usage#listen-for-revocation) subscribes to this event.

## Android

The Android module has no system API for Sign in with Apple, so it follows Apple's web flow inside the app. `AppleSignInCoordinator` checks that `clientId` and `redirectUri` are present, then starts `AppleSignInActivity`, which is declared in the library manifest as a non-exported activity. The activity loads `https://appleid.apple.com/auth/authorize` in a WebView with these query parameters:

| Parameter | Value |
|---|---|
| `client_id` | `clientId`, the Services ID |
| `redirect_uri` | `redirectUri` |
| `response_type` | `code id_token` |
| `response_mode` | `form_post` |
| `scope` | The scopes joined by spaces, with `fullName` written as `name`. Falls back to `name email` when empty. |
| `state` | The `state` value, or a random UUID when it is missing |
| `nonce` | The hashed nonce, sent only when it is not blank |

With `form_post`, Apple sends the result as a POST request to the redirect URI. The activity watches the WebView traffic for a POST request whose scheme, host, port, and path equal those of `redirectUri`. A trailing slash on the path does not matter, and neither do the query and the fragment. When such a request appears, the activity stops the load and runs a small script that collects every named field of the page forms and passes them to Kotlin as one JSON object. The fields `id_token`, `code`, `state`, and `user` become the credential record. The `user` field carries the email and the first and last name, and appears only on the first authorization. Apple's web flow sends no middle name, prefix, suffix, or nickname, so those record fields stay empty. The native record also leaves `user` (the identifier) empty on Android, and `realUserStatus` is always `unknown`. The JavaScript layer takes the identifier from the `sub` claim of the identity token.

The close button ends the flow as a cancel, and so does the system back action, which the activity handles through `OnBackPressedDispatcher`. If the activity is destroyed before a result arrives, the pending request is canceled as well. Only one request can be pending at a time. A second `signIn` call rejects with `ERR_REQUEST_FAILED` and a message that contains `A Sign in with Apple request is already in progress.`

The library manifest declares `configChanges` for orientation, screen size, hardware keyboard availability, screen layout, and UI mode, so a rotation or a switch to dark mode keeps the activity, its WebView, and the page Apple is showing. The activity also uses `adjustResize`, so the page resizes when the keyboard opens. `android/build.gradle` sets the library version to `1.1.0`.

## How errors reach JavaScript

Every native failure becomes a coded error, and the JavaScript layer runs it through [`normalizeAppleError`](/guides/errors#helpers).

| Platform | Source | Code |
|---|---|---|
| iOS | `ASAuthorizationError.canceled` | `ERR_REQUEST_CANCELED` |
| iOS | `ASAuthorizationError.invalidResponse`, or a credential that is not an Apple ID credential | `ERR_INVALID_RESPONSE` |
| iOS | `failed`, `notHandled`, `notInteractive`, `matchedExcludedCredential`, `credentialImport`, `credentialExport`, `preferSignInWithApple`, `deviceNotConfiguredForPasskeyCreation`, no available window, or a sign-in already running | `ERR_REQUEST_FAILED` |
| iOS | `ASAuthorizationError.unknown`, a code added by a later SDK, or an error that is not an `ASAuthorizationError` | `ERR_REQUEST_UNKNOWN` |
| Android | Missing `clientId` or `redirectUri` | `ERR_NOT_CONFIGURED` |
| Android | No application context, or a sign-in already running | `ERR_REQUEST_FAILED` |
| Android | Close button, back action, activity destroyed before a result, or a redirect form that lacks `state` or carries none of `id_token`, `code`, and `user` | `ERR_REQUEST_CANCELED` |
| Android | Returned `state` differs from the one sent, or the form data cannot be parsed | `ERR_INVALID_RESPONSE` |

The iOS module lists only the `ASAuthorizationError` codes that the SDK it is built with declares. `matchedExcludedCredential` needs Swift 6 (Xcode 16), `credentialImport` and `credentialExport` need Swift 6.0.3 (Xcode 16.2), and `preferSignInWithApple` and `deviceNotConfiguredForPasskeyCreation` need Swift 6.2 (Xcode 26). The codes added in Xcode 16.2 and Xcode 26 do not apply to an Apple ID request. The iOS exceptions set their `code` property to the value in the table. On Android the error class `AppleAuthNativeError` extends the Expo Modules 2.0 `JavaScriptThrowable` and overrides `code`, so the runtime sets `code` and `message` on the JavaScript rejection and `normalizeAppleError` keeps them. The older `CODE: message` form is still parsed as a fallback for errors that arrive without a `code`.

## Related

The [API reference](/reference/api) lists the JavaScript surface, and [Troubleshooting](/reference/troubleshooting) covers a module that fails to load.
