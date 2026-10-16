---
name: expo-apple-sign-in
description: "Add Sign in with Apple to an Expo SDK 58 app on iOS, Android, and web with expo-apple-sign-in: one AppleAuth.signIn call, the useAppleAuth hook, the AppleButton component, and adapters for Supabase, Clerk, and Firebase. Use when adding Apple login to an Expo or React Native app, replacing expo-apple-authentication or @invertase/react-native-apple-authentication, setting up the Services ID and redirect URI that Android and web need, passing the nonce to Supabase signInWithIdToken or Firebase, wiring Clerk oauth_token_apple, enabling web redirect sign-in on phones, verifying the identity token on a server, or testing Apple sign-in locally through a tunnel. Do not use for Expo SDK 57 or older, Expo Go, or native apps without Expo. Triggers: sign in with apple, apple login, apple auth, apple id, expo-apple-authentication, AuthenticationServices, Services ID, invalid_client, redirect_uri, nonce mismatch, ERR_REQUEST_CANCELED, appleid.apple.com."
license: MIT
compatibility: Expo SDK 58 apps built as development or release builds (Expo Go cannot load the native module). Android and web need an Apple Services ID and an HTTPS redirect URI.
metadata:
  author: massimodeluisa
  version: "1.1.0"
  website: https://exsi.smartsquad.io
  repository: https://github.com/smartsquad/expo-apple-sign-in
  npm: https://www.npmjs.com/package/expo-apple-sign-in
---

# expo-apple-sign-in

One API and one credential shape for Sign in with Apple on iOS (`AuthenticationServices`), Android (Services ID web flow in a WebView), and web (Apple JS popup or full-page redirect). Built with Expo Modules 2.0 for Expo SDK 58 only.

## Rules

- Pass `credential.nonce` unchanged to Supabase, Firebase, or your server. Never hash it again: the library sends the SHA-256 hex digest to Apple and returns the raw value.
- Do not add `expo-crypto`, `expo-apple-authentication`, `@invertase/react-native-apple-authentication`, or `react-apple-signin-auth`.
- Expo Go cannot load the native module. Use a development or release build.
- Never log identity tokens, authorization codes, or nonces.
- Never ship Apple `.p8` keys in the app.
- On iOS and Android only one sign-in runs at a time. A second call rejects with `ERR_REQUEST_FAILED`.
- On web the popup needs a user gesture. Call `signIn` from a press or click handler.

## Install

```bash
npx expo install expo-apple-sign-in
```

Add the config plugin to `app.json`. It writes the `com.apple.developer.applesignin` entitlement.

```json
{ "expo": { "plugins": ["expo-apple-sign-in"] } }
```

Delete `ios.usesAppleSignIn` if it is set. It only triggers an `expo-apple-authentication` warning during prebuild. Then rebuild:

```bash
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```

## Apple Developer setup

- iOS: the App ID of the bundle identifier needs the Sign in with Apple capability. No Services ID.
- Android and web: create a Services ID (the `clientId`) with Sign in with Apple enabled. Add the host under Domains and Subdomains and the exact `redirectUri` under Return URLs.
- HTTPS only. Apple rejects `localhost` and IP addresses.
- Web: `redirectUri` must have the same origin as the page. A Supabase `/auth/v1/callback` URL is another origin and is rejected on web.

Full steps: https://exsi.smartsquad.io/setup/apple-developer.html

## Configure

Call `AppleAuth.configure` once at startup.

```ts
import { Platform } from 'react-native'
import { AppleAuth } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri:
    Platform.OS === 'web' ? 'https://web.example.com/auth/apple' : 'https://example.com/auth/apple',
  scopes: ['name', 'email'],
  webMode: 'popup',
})
```

- `scopes` is optional and takes `'name' | 'email' | 'fullName'` (`fullName` equals `name`). `webMode` is optional.
- iOS ignores `clientId` and `redirectUri`.
- `AppleAuth.isConfigured()` is always true on iOS. On Android and web it is true once both values are set. Without them, sign-in rejects with `ERR_NOT_CONFIGURED`.
- Use a per-platform `redirectUri` (as above) when Android and web register Return URLs on different hosts.

## Sign in

```ts
import { AppleAuth, isCancelledResponse, isErrorResponse, isSuccessResponse } from 'expo-apple-sign-in'

const credential = await AppleAuth.signIn()

const response = await AppleAuth.request()
if (isSuccessResponse(response)) {
  console.log(response.data.user.id)
} else if (isCancelledResponse(response)) {
  // the user dismissed the sheet
} else if (isErrorResponse(response)) {
  console.warn(response.code)
}
```

- `AppleAuth.signIn(options?)` resolves a `TAppleCredential` and rejects with `AppleAuthError`. A dismiss rejects with `ERR_REQUEST_CANCELED`.
- `AppleAuth.request(options?)` never throws for cancel or failure. It resolves `{ type: 'success', data }`, `{ type: 'cancelled' }`, or `{ type: 'error', code, message, cause? }`.
- Options: `nonce` (raw, generated when omitted), `state` (generated when omitted), `scopes`.
- Credential: `identityToken`, `authorizationCode` (or null), `nonce` (raw), `state`, `realUserStatus`, and `user` with `id`, `email`, `givenName`, `familyName`, `middleName`, `namePrefix`, `nameSuffix`, `nickname` (each may be null).
- Apple sends name and email only on the first authorization. Store them then. The name is never in the token. `user.id` and `user.email` are filled from the token when possible.
- Only iOS fills `middleName`, `namePrefix`, `nameSuffix`, and `nickname`. Only iOS reports `realUserStatus`. Other platforms return `'unknown'`.
- `AppleAuth.isAvailable()` returns `Promise<boolean>`.
- `AppleAuth.getCurrentCredential()` returns the last credential, kept in memory only.
- `AppleAuth.signOut()` only clears that in-memory credential. Apple has no client-side sign-out, so also end the Supabase, Clerk, or Firebase session.
- `generateNonce` and `sha256Hex` are exported for servers or custom flows.

## Button and hook

```tsx
import { AppleButton } from 'expo-apple-sign-in'

<AppleButton
  buttonStyle="black"
  buttonType="signIn"
  onSuccess={(credential) => console.log(credential.user.id)}
  onCancel={() => {}}
  onError={(error) => console.warn(error.code)}
/>
```

- `AppleButton` props: `buttonStyle` (`'black' | 'white' | 'whiteOutline'`), `buttonType` (`'signIn' | 'continue' | 'signUp'`), `label`, `cornerRadius`, `height`, `width`, `disabled`, `style`, `textStyle`, `onSuccess(credential)`, `onError(error)`, `onCancel()`, `onPress`, `children`.
- `onPress` takes over the press. The button then does not sign in by itself.
- `children` replaces the Apple mark and the label. Other `Pressable` props such as `testID` pass through. `APPLE_BUTTON_HEIGHT` is exported.
- To run an adapter from the button, pass `onPress={() => signInWithSupabase(supabase)}`. Do not call an adapter from `onSuccess`: the button has already signed in, and the adapter would start a second sign-in.
- `useAppleAuth(options?)` takes the config fields plus `treatCancelAsError` (default false).
- It returns `signIn(options?)` (the credential, or null on cancel unless `treatCancelAsError`), `signOut()`, `credential`, `isLoading`, `error`, `isAvailable`, and `isConfigured`. It clears `credential` when Apple revokes it on iOS.

## Providers

Every adapter runs `AppleAuth.signIn()` first and throws `ERR_MISSING_IDENTITY_TOKEN` when there is no identity token.

Supabase (`expo-apple-sign-in/supabase` or the package root):

```ts
import { signInWithSupabase } from 'expo-apple-sign-in'

const { credential, data } = await signInWithSupabase(supabase)
```

It calls `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })`. In the Supabase Apple provider, the Client IDs field must list every bundle ID (and variants such as `.dev`) and the Services ID, because Supabase checks the token `aud` against it.

Clerk (strategy `oauth_token_apple`, Clerk does not need the nonce):

```tsx
import { useSignIn, useSignUp } from '@clerk/expo/legacy'
import { AppleButton, isCancelledError, signInWithClerk } from 'expo-apple-sign-in'
import type { ReactElement } from 'react'

export function AppleSignIn(): ReactElement {
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn()
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp()

  const handlePress = async (): Promise<void> => {
    if (!isSignInLoaded || !isSignUpLoaded) {
      return
    }

    try {
      await signInWithClerk({ signIn, signUp, setActive })
    } catch (error) {
      if (!isCancelledError(error)) {
        console.warn(error)
      }
    }
  }

  return <AppleButton onPress={handlePress} disabled={!isSignInLoaded || !isSignUpLoaded} />
}
```

Take `signIn` and `signUp` from `useSignIn()` and `useSignUp()` of `@clerk/expo/legacy`, and wait until both report `isLoaded`. `signInWithClerk` resolves `{ credential, createdSessionId }`, calls `setActive` when Clerk creates a session, and handles Clerk's transfer step.

Firebase (`firebase/auth`):

```ts
import { getAuth, OAuthProvider, signInWithCredential } from 'firebase/auth'
import { signInWithFirebase, type TFirebaseAppleCredential } from 'expo-apple-sign-in'

import { app } from '../lib/firebase'

const signInWithApple = (apple: TFirebaseAppleCredential): Promise<unknown> => {
  const provider = new OAuthProvider(apple.providerId)
  const credential = provider.credential({ idToken: apple.token, rawNonce: apple.rawNonce })

  return signInWithCredential(getAuth(app), credential)
}

const { credential, data } = await signInWithFirebase(signInWithApple)
```

- `toFirebaseAppleCredential(credential)` returns `{ providerId: 'apple.com', token, rawNonce }`.
- With `@react-native-firebase/auth`, build the credential with `AppleAuthProvider.credential(apple.token, apple.rawNonce)`.

## Web

- Popup is the default (`webMode: 'popup'`). A blocked popup rejects with `ERR_REQUEST_FAILED`.
- For phone browsers set `webMode: 'auto'` (redirect on Android, iPhone, iPad, and iPod browsers, popup elsewhere) or `'redirect'`.
- Answer Apple's POST at the `redirectUri` path with `handleAppleWebRedirect` in an Expo Router route such as `app/auth/callback+api.ts`:

```ts
import { handleAppleWebRedirect } from 'expo-apple-sign-in/server'

export const POST = handleAppleWebRedirect
```

- API routes need `web.output: "server"`, or `"static"` with `["expo-router", { "apiRoutes": true }]` in plugins. A static host cannot answer the POST (405 or 404).
- After the return, `AppleButton` and `useAppleAuth` replay the result on mount. Without them, call `AppleAuth.signIn()` or the adapter at startup when `AppleAuth.hasWebRedirectResult()` is true.
- The result lives in `sessionStorage` of the tab that started sign-in and is delivered once.
- Allow `https://appleid.apple.com` in a Content Security Policy.

Full steps: https://exsi.smartsquad.io/setup/web.html

## iOS credential state

- `AppleAuth.getCredentialState(userId)` resolves `'authorized' | 'revoked' | 'notFound' | 'transferred' | 'unknown'` on iOS, and always `'unknown'` on Android and web.
- `AppleAuth.addRevokeListener(listener)` returns `{ remove() }`. Only iOS calls the listener. Call `remove()` on unmount.

## Errors

Every failure is an `AppleAuthError` with a `code`, `message`, and optional `cause`.

| Code | Meaning |
|---|---|
| `ERR_REQUEST_CANCELED` | The person dismissed the sign-in. |
| `ERR_REQUEST_FAILED` | The attempt failed (another sign-in running, blocked popup, simulator without an Apple Account). |
| `ERR_NOT_CONFIGURED` | `clientId` or `redirectUri` is missing, or the web origin differs. |
| `ERR_NOT_AVAILABLE` | The native module is not linked, or Apple JS did not load. |
| `ERR_MISSING_IDENTITY_TOKEN` | The result had no identity token. |
| `ERR_INVALID_RESPONSE` | Apple's response was not usable. |
| `ERR_REQUEST_UNKNOWN` | The failure matches no other code. |

Helpers: `isAppleAuthError(error)`, `isCancelledError(error)`, and the `AppleAuthErrorCode` constants.

## Verify on a server

Send both `identityToken` and `nonce` to your server and check:

1. The RS256 signature against the keys at `https://appleid.apple.com/auth/keys`.
2. `iss` equals `https://appleid.apple.com`.
3. `aud` equals the bundle ID for iOS tokens and the Services ID for Android and web tokens.
4. `exp` is in the future.
5. The `nonce` claim equals the SHA-256 hex digest of `credential.nonce`.

Use `sub` as the account key. Details: https://exsi.smartsquad.io/guides/backend.html

## Test locally

- Apple rejects `localhost` and IP addresses, so test web and Android through an HTTPS tunnel: `HOME="$(mktemp -d)" cloudflared tunnel --url http://127.0.0.1:<port>`.
- Register the tunnel host and `https://<host>/<path>` on the Services ID, and pass that URL as `redirectUri`.
- Quick-tunnel hosts change on every start, so register the new host and URL each time.
- `EXPO_PUBLIC_*` values are inlined at bundle time. Rebuild or re-export after changing them.
- Web redirect mode needs the app's server to answer Apple's POST. The example's `npm run web:serve` does.
- Android only needs the Return URL registered. Nothing has to answer it.
- iOS needs a physical device, or a simulator signed in to an Apple Account, and a bundle identifier whose App ID has Sign in with Apple.

Full steps: https://exsi.smartsquad.io/guides/local-testing.html

## Troubleshooting

- `invalid_client` or a redirect mismatch: the Services ID and the Return URL must match what you pass to `configure`, character by character, including scheme and path.
- `ERR_NOT_CONFIGURED` on Android or web: call `AppleAuth.configure` with both `clientId` and `redirectUri`, and on web use a `redirectUri` on the page's origin.
- Supabase rejects the nonce: the nonce was hashed twice. Pass `credential.nonce` unchanged.
- iOS Simulator fails: sign in to an Apple Account in the simulator's Settings, or use a device.
- Popup blocked: call `signIn` from a press or click handler.
- Apple's page errors in a phone browser popup: use `webMode: 'auto'` and answer the POST.
- POST gets 405 or 404: add the API route at the `redirectUri` path and turn on API routes.
- Name or email is null after the first sign-in: Apple sends them once. Store them on the first response.

## Docs

- https://exsi.smartsquad.io/
- https://exsi.smartsquad.io/reference/api.html
- https://exsi.smartsquad.io/llms-full.txt
