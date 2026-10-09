# Introduction

`expo-apple-sign-in` adds Sign in with Apple to an Expo app on iOS, Android and web through one JavaScript API. You call `AppleAuth.signIn()` or render `AppleButton`, and each platform resolves with the same credential: Apple's identity token, the authorization code, the raw nonce, the state and whatever user details Apple shared.

::: warning Expo SDK 58 only
**expo-apple-sign-in requires Expo SDK 58.** Its native code is written with the Expo Modules 2.0 API (`@ExpoModule` and `@JS`), which earlier SDKs do not support. Expo Go cannot load the native module either, so iOS and Android need a development build.
:::

## Why the library exists

On iOS, Apple provides a native sign-in sheet. Android and web have only Apple's web flow. An app that supports all three platforms therefore talks to Apple in two different ways, and the results have to be turned into the same thing before an auth provider or a server can use them. The library does that work and gives you one API, one credential shape and one nonce rule.

The API is the same everywhere: `AppleAuth.signIn()`, the `useAppleAuth` hook and the `AppleButton` component accept the same options on iOS, Android and web, and they resolve with an `AppleCredential` object of the same shape. Code that sends the credential to Supabase, Clerk, Firebase or your own backend does not need a branch per platform.

The nonce follows one rule. You pass a raw nonce to `signIn`, or let the library generate one, and the library sends its SHA-256 hash to Apple. Apple writes that hash into the identity token's `nonce` claim, and the library returns the raw value on `credential.nonce`. Supabase and Firebase hash the raw nonce themselves and compare the result with the claim, so you pass `credential.nonce` to them unchanged and never hash it again.

The adapters cover the last step. `signInWithSupabase`, `signInWithClerk` and `signInWithFirebase` run `AppleAuth.signIn()` and hand the identity token, plus the raw nonce where the provider needs it, to the provider's SDK. The provider pages for [Supabase](/providers/supabase), [Clerk](/providers/clerk) and [Firebase](/providers/firebase) show each call with its dashboard setup.

## How each platform signs in

| Platform | How the library reaches Apple | What you set up |
| --- | --- | --- |
| iOS | A Swift module calls Apple's AuthenticationServices framework, and the system shows Apple's native sign-in sheet. | An App ID with Sign in with Apple enabled. The config plugin adds the entitlement. |
| Android | A Kotlin activity opens Apple's authorize page in a WebView with `response_mode=form_post` and reads the identity token from the form Apple posts back. | A Services ID, passed as `clientId`, and an HTTPS `redirectUri` registered on it. |
| Web | The library loads Apple's JavaScript SDK (Apple JS) from `appleid.apple.com` and signs in with a popup window. | The same Services ID and a `redirectUri` on the same origin as the page. |

Because Android and web go through Apple's web flow, both need the Services ID and redirect URI from [Apple Developer](/setup/apple-developer) and a call to `AppleAuth.configure`. iOS uses the App ID and ignores those values. The [iOS](/setup/ios), [Android](/setup/android) and [Web](/setup/web) setup pages describe each flow in detail.

## What the package exports

| Export | Purpose |
| --- | --- |
| `AppleAuth` | Configures the library and runs sign-in: `configure`, `getConfig`, `isConfigured`, `isAvailable`, `signIn`, `request`, `getCurrentCredential`, `getCredentialState` and `signOut`. |
| `AppleButton`, `AppleLogo`, `APPLE_BUTTON_HEIGHT` | The Apple-style button with the official labels, the Apple mark it draws, and its default height of 48. |
| `useAppleAuth` | A React hook that wraps `AppleAuth.signIn()` and exposes `credential`, `isLoading`, `error`, `isAvailable` and `isConfigured`. |
| `AppleAuthError`, `EAppleAuthErrorCode`, `isAppleAuthError`, `isCancelledError`, `normalizeAppleError` | Typed errors with stable codes such as `ERR_REQUEST_CANCELED` and `ERR_NOT_CONFIGURED`. |
| `isSuccessResponse`, `isErrorResponse`, `isCancelledResponse` | Guards for the result of `AppleAuth.request()`, which returns a result object instead of throwing. |
| `signInWithSupabase`, `signInWithClerk`, `signInWithFirebase`, `toFirebaseAppleCredential` | Provider adapters. They are also published at `expo-apple-sign-in/supabase`, `expo-apple-sign-in/clerk` and `expo-apple-sign-in/firebase`. |
| `generateNonce`, `sha256Hex` | The nonce helpers the library uses internally. |

The package also exports its TypeScript types, such as `AppleCredential`, `AppleAuthConfig` and `AppleSignInOptions`. The API reference lists every export with its signature.

## Where to go next

Start with [Requirements](/getting-started/requirements) and [Installation](/getting-started/installation), then follow the [Quick start](/getting-started/quick-start) to get a first credential on screen. If you are deciding between libraries, the [Comparison](/comparison) page sets `expo-apple-sign-in` beside `expo-apple-authentication`, `@invertase/react-native-apple-authentication`, and `react-apple-signin-auth`.
