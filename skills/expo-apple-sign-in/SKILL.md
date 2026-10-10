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
- Web opens Apple's popup, so call `signIn` from a click or press handler. A blocked popup rejects with `ERR_REQUEST_FAILED`.
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

Do **not** add `expo-crypto` or `expo-apple-authentication` for this flow.
