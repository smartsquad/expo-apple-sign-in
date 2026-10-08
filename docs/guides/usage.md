# Usage

`AppleAuth` is the headless entry point of `expo-apple-sign-in`. It runs the Sign in with Apple flow on iOS, Android, and web through one set of calls and hands your code a credential with the identity token and the raw nonce, so you can render any interface and send the token to any backend. This page walks through the whole lifecycle in order: configure, check availability, sign in, read the credential, check its state, and sign out. If you want a ready-made interface instead, see the [Apple button](/guides/button) and the [useAppleAuth hook](/guides/hook).

## Configure

iOS signs in with the App ID of your app and needs no configuration. Android and web use a Services ID as `clientId` and an HTTPS `redirectUri` registered for that Services ID in the Apple Developer portal. Call `configure` once at startup, before the first sign-in.

```ts [lib/apple-auth.ts]
import { AppleAuth } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/apple',
  scopes: ['name', 'email'],
})
```

`configure` merges the values you pass into the stored configuration and skips `undefined` values, so you can call it again later to change a single field. `scopes` defaults to `['name', 'email']` when you never set it. `AppleAuth.getConfig()` returns a copy of the stored configuration, and `AppleAuth.isConfigured()` returns `true` on iOS and, on Android and web, only when both `clientId` and `redirectUri` are set. The [Apple Developer](/setup/apple-developer), [Android](/setup/android), and [Web](/setup/web) setup pages explain where each value comes from.

::: warning Web redirect URI
On web, `redirectUri` must have the same origin as the page that starts the sign-in. A different origin makes the call fail with `ERR_NOT_CONFIGURED` before Apple opens. See Troubleshooting.
:::

## Check availability

`AppleAuth.isAvailable()` returns a `Promise<boolean>`. On web it is `true` when a browser document exists. On iOS and Android it is `true` when the native module is linked, and `false` when it is missing, for example in Expo Go.

```ts [lib/apple-available.ts]
import { AppleAuth } from 'expo-apple-sign-in'

export async function canShowAppleSignIn(): Promise<boolean> {
  const available = await AppleAuth.isAvailable()

  return available && AppleAuth.isConfigured()
}
```

## Sign in

`AppleAuth.signIn(options?)` opens the Apple sheet on iOS, an in-app WebView on Android, and the Apple JS popup on web. It resolves with an `AppleCredential` and rejects with an [`AppleAuthError`](/guides/errors) otherwise.

```ts [lib/sign-in.ts]
import { AppleAuth, generateNonce } from 'expo-apple-sign-in'
import type { TAppleCredential } from 'expo-apple-sign-in'

export async function signInWithApple(): Promise<TAppleCredential> {
  const nonce = generateNonce()

  return AppleAuth.signIn({
    nonce,
    state: 'checkout-flow',
    scopes: ['name', 'email'],
  })
}
```

All three options are optional.

| Option | Type | Default | Description |
|---|---|---|---|
| `nonce` | `string` | generated | Raw, unhashed nonce. The library hashes it with SHA-256 before Apple sees it and returns the same raw value on `credential.nonce`. Never hash it yourself. |
| `state` | `string` | generated | Opaque value that Apple echoes back. A random 16-byte hex value is generated when you omit it. |
| `scopes` | `AppleScope[]` | configured scopes | Overrides the scopes from `configure` for this call. `'name'` and `'fullName'` request the same data. |

When you omit `nonce`, the library generates one with `generateNonce()` (32 bytes from a secure random source, as 64 hex characters) and still returns it on the credential. Pass your own nonce when your server issues it and wants to check it later. The Android flow compares the returned `state` with the one it sent and fails with `ERR_INVALID_RESPONSE` when they differ.

### What the credential contains

| Field | Type | Meaning |
|---|---|---|
| `identityToken` | `string` | JWT signed by Apple. Send it to your backend or auth provider. |
| `authorizationCode` | `string \| null` | Single-use code that a server can exchange for tokens. |
| `nonce` | `string` | The raw nonce that was hashed for Apple. Pass it unchanged to Supabase and Firebase. |
| `state` | `string \| null` | The `state` value Apple echoed back. |
| `user.id` | `string \| null` | Stable Apple user identifier. |
| `user.email` | `string \| null` | Email address, possibly a private relay address. |
| `user.givenName` | `string \| null` | First name. |
| `user.familyName` | `string \| null` | Last name. |
| `realUserStatus` | `'unknown' \| 'likelyReal' \| 'unsupported'` | Apple's signal that the account belongs to a real person. Only iOS reports it. Android and web return `'unknown'`. |

The library reads `user.id` and `user.email` from the identity token when the platform did not return them, so both are usually filled. That decoding does not verify the signature. Your backend still has to verify the token, as described in [Backend verification](/guides/backend).

::: warning Name and email arrive once
Apple returns the name and the email only the first time a person authorizes your app. Later sign-ins return `null` for `givenName` and `familyName`, and the library fills `user.email` from the identity token. The name never appears inside the identity token. Store it the moment you receive it. To receive it again while testing, remove the app under Apple ID settings, Sign in with Apple, and sign in again.
:::

```ts [lib/store-profile.ts]
import { AppleAuth } from 'expo-apple-sign-in'

export async function signInAndStoreName(): Promise<void> {
  const credential = await AppleAuth.signIn()
  const { givenName, familyName } = credential.user

  if (givenName || familyName) {
    await fetch('https://api.example.com/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appleUserId: credential.user.id, givenName, familyName }),
    })
  }
}
```

## request and signIn

`signIn` and `request` run the same flow. They differ only in how they report the outcome.

`signIn` is built on `request`. It resolves with the credential on success. It throws `AppleAuthError` with the code `ERR_REQUEST_CANCELED` when the person dismisses the sheet, and it throws an `AppleAuthError` that carries the original `code` and `message` when the flow fails. Choose it when you want the usual `try`/`catch` shape, and when you pass the call to an adapter.

`request` never rejects. It catches every error, including configuration errors, and resolves with a discriminated union: `{ type: 'success', data }`, `{ type: 'cancelled' }`, or `{ type: 'error', code, message }`. Choose it when a cancel is a normal outcome that you do not want to treat as an exception. The helpers `isSuccessResponse`, `isCancelledResponse`, and `isErrorResponse` narrow the union.

```ts [lib/request.ts]
import { AppleAuth, isCancelledResponse, isErrorResponse, isSuccessResponse } from 'expo-apple-sign-in'
import type { TAppleCredential } from 'expo-apple-sign-in'

export async function requestAppleCredential(): Promise<TAppleCredential | null> {
  const response = await AppleAuth.request()

  if (isSuccessResponse(response)) {
    return response.data
  }

  if (isCancelledResponse(response)) {
    return null
  }

  if (isErrorResponse(response)) {
    console.warn(`Apple sign-in failed with ${response.code}: ${response.message}`)
  }

  return null
}
```

## Read the last credential

`AppleAuth.getCurrentCredential()` returns the credential from the most recent successful sign-in, or `null`. It lives in memory only, so it is `null` after an app restart and after `signOut()`. Persist what you need (your own session, the Apple user id) yourself.

## Check the credential state

`AppleAuth.getCredentialState(userId)` returns one of `'authorized'`, `'revoked'`, `'notFound'`, `'transferred'`, or `'unknown'`.

On iOS the call asks the system. On Android and web there is no such API, so the library answers `'authorized'` when `userId` matches the user of the last credential in memory and `'unknown'` otherwise. Run the check at startup, with the Apple user id you stored, to find out whether the person revoked access.

```ts [lib/credential-state.ts]
import { AppleAuth } from 'expo-apple-sign-in'

export async function isAppleSessionStillValid(appleUserId: string): Promise<boolean> {
  const state = await AppleAuth.getCredentialState(appleUserId)

  return state === 'authorized'
}
```

## Sign out

`AppleAuth.signOut()` clears the in-memory credential and nothing else. Apple has no sign-out API, so there is no Apple session to end. Sign out of your own session (Supabase, Clerk, Firebase, or your server) in the same place.

```ts [lib/sign-out.ts]
import { AppleAuth } from 'expo-apple-sign-in'

export async function signOutOfApple(): Promise<void> {
  await AppleAuth.signOut()
}
```

## Next steps

Handle failures with the [error codes](/guides/errors#codes), verify the token on your server with [Backend verification](/guides/backend), or pass the credential to a provider through an adapter: Supabase, Clerk, or Firebase. Every signature is listed in the API reference.
