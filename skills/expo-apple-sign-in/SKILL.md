---
name: expo-apple-sign-in
description: Universal Sign in with Apple for Expo SDK 58 / Modules 2.0. Use when adding Apple auth, replacing expo-apple-authentication, or wiring Clerk / Supabase / Firebase.
---

# expo-apple-sign-in

## Install

```bash
npx expo install expo-apple-sign-in
```

Add `"expo-apple-sign-in"` to `expo.plugins` in `app.json`, then rebuild with `npx expo prebuild` and `npx expo run:ios` or `npx expo run:android`. The library requires Expo SDK 58, and Expo Go cannot load it because it ships a custom native module.

## API

```ts
import { AppleAuth, AppleButton, useAppleAuth, signInWithSupabase, signInWithClerk } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.service',
  redirectUri: 'https://app.example.com/callback',
})

const { identityToken, nonce } = await AppleAuth.signIn()
```

- iOS uses the native `AuthenticationServices` framework and needs no Services ID.
- Android and web need a Services ID and an HTTPS redirect URI.
- The library SHA-256-hashes the nonce for Apple and returns the **raw** nonce.
- When the user dismisses the sheet, `AppleAuth.signIn()` throws `ERR_REQUEST_CANCELED` and `AppleAuth.request()` resolves `{ type: 'cancelled' }`.
- `AppleAuth.isAvailable()` returns `Promise<boolean>`.
- `toFirebaseAppleCredential` returns `{ providerId: 'apple.com', token, rawNonce }`.
- `AppleAuth.getCredentialState(userId)` resolves `'authorized'`, `'revoked'`, `'notFound'`, `'transferred'`, or `'unknown'` on iOS, and always `'unknown'` on Android and web.
- `AppleAuth.addRevokeListener(listener)` returns `{ remove() }`. Only iOS calls the listener. Call `remove()` on unmount.
- iOS and Android run one sign-in at a time. A second `signIn` while one is pending rejects with `ERR_REQUEST_FAILED`.
- Web uses Apple's popup by default, so call `signIn` from a click or press handler. A blocked popup rejects with `ERR_REQUEST_FAILED`.
- For phone browsers, set `webMode: 'auto'` in `AppleAuth.configure` and add `export const POST = handleAppleWebRedirect` (from `expo-apple-sign-in/server`) in an Expo Router `+api.ts` route at `redirectUri`, for example `app/auth/callback+api.ts`. Redirect mode needs a deployed server.
- After a web redirect, `AppleButton` and `useAppleAuth` replay the sign-in on mount. Without them, call `AppleAuth.signIn()` or the adapter at startup when `AppleAuth.hasWebRedirectResult()` is true.
- On the first authorization, iOS also fills `middleName`, `namePrefix`, `nameSuffix`, and `nickname` on `credential.user`. Android and web return `null` for them.

## Supabase

```ts
await signInWithSupabase(supabase)
```

That is `AppleAuth.signIn()` plus `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })`. Do not call this from `AppleButton` `onSuccess`.

## Clerk

```ts
await signInWithClerk({ signIn, signUp, setActive })
```

`signInWithClerk` uses the `oauth_token_apple` strategy.

## Custom UI

Use `useAppleAuth()` and render anything. It returns `signIn(options?)`, `signOut()`, `credential`, `isLoading`, `error`, `isAvailable`, and `isConfigured`, and clears `credential` when Apple revokes it on iOS. Use `<AppleButton />` for the HIG black/white button. Pass `onPress` to take over the press, or `children` to replace the Apple mark and the label. Other `Pressable` props, such as `testID`, pass through.

## Test locally

- Apple rejects `localhost` and IP addresses, so test web and Android through an HTTPS tunnel: `HOME="$(mktemp -d)" cloudflared tunnel --url http://127.0.0.1:<port>`.
- Register the tunnel host and `https://<host>/<path>` on the Services ID, and pass that URL as `redirectUri`.
- Quick-tunnel hosts change on every start, so register the new host and URL each time.
- `EXPO_PUBLIC_*` values are inlined at bundle time. Rebuild or re-export after changing them.
- Web redirect mode needs the app's server to answer Apple's POST. The example's `npm run web:serve` does.
- Android only needs the Return URL registered. Nothing has to answer it.
- iOS needs a physical device, or a simulator signed in to an Apple Account, and a bundle identifier whose App ID has Sign in with Apple.
- Full steps: https://exsi.smartsquad.io/guides/local-testing.html

Do **not** add `expo-crypto` or `expo-apple-authentication` for this flow.
