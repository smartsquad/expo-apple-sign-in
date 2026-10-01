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

- iOS: native `AuthenticationServices`. No Services ID.
- Android / web: Services ID + HTTPS redirect URI.
- The library SHA-256-hashes the nonce for Apple and returns the **raw** nonce.
- `ERR_REQUEST_CANCELED` is thrown (or returned from `request()`) when the user dismisses the sheet.
- `AppleAuth.isAvailable()` returns `Promise<boolean>`.
- `toFirebaseAppleCredential` returns `{ providerId: 'apple.com', token, rawNonce }`.

## Supabase

```ts
await signInWithSupabase(supabase)
```

That is `AppleAuth.signIn()` plus `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })`. Do not call this from `AppleButton` `onSuccess`.

## Clerk

```ts
await signInWithClerk({ signIn, signUp, setActive })
```

Strategy: `oauth_token_apple`.

## Custom UI

Use `useAppleAuth()` and render anything. Use `<AppleButton />` for the HIG black/white button. Pass `onPress` to take over the press, or `children` to replace the label.

Do **not** add `expo-crypto` or `expo-apple-authentication` for this flow.
