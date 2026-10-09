<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/logo-dark.svg">
    <img src="docs/public/logo-light.svg" alt="Expo Apple Sign In" width="120">
  </picture>
</p>

<h1 align="center">expo-apple-sign-in</h1>

<p align="center">
  <strong>Sign in with Apple for Expo SDK 58.</strong><br />
  One API and one Apple-style button for iOS, Android and web, with adapters for Supabase, Clerk and Firebase
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/expo-apple-sign-in"><img src="https://img.shields.io/npm/v/expo-apple-sign-in?style=flat-square" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License: MIT" /></a>
  <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo%20SDK-58-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo SDK 58" /></a>
  <img src="https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-4630EB?style=flat-square" alt="Platforms: iOS, Android, Web" />
</p>

<p align="center">
  <a href="https://smartsquad.github.io/expo-apple-sign-in/">Documentation</a> ·
  <a href="https://smartsquad.github.io/expo-apple-sign-in/getting-started/quick-start.html">Quick start</a> ·
  <a href="https://smartsquad.github.io/expo-apple-sign-in/providers/supabase.html">Providers</a> ·
  <a href="https://smartsquad.github.io/expo-apple-sign-in/comparison.html">Comparison</a> ·
  <a href="https://github.com/smartsquad/expo-apple-sign-in/blob/main/CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <img src="docs/public/og.png" alt="expo-apple-sign-in. Sign in with Apple for Expo SDK 58." width="800" />
</p>

---

> [!IMPORTANT]
> **Expo SDK 58 only.** The native code is written with Expo Modules 2.0 (`@ExpoModule` and `@JS`), which earlier SDKs do not support. Expo Go cannot load the native module, so iOS and Android need a development build.

## Install

```bash
npx expo install expo-apple-sign-in
```

Add the config plugin to `app.json`, then build a development client. The plugin enables the Sign in with Apple entitlement for iOS.

```json
{
  "expo": {
    "plugins": ["expo-apple-sign-in"]
  }
}
```

```bash
npx expo prebuild
npx expo run:ios
```

## Quick start

On iOS the library signs in with your app's App ID, so it needs no configuration. Android and web open Apple's web flow, which needs a Services ID and an HTTPS Return URL registered in the Apple Developer portal. Pass both to `AppleAuth.configure` once, then render `AppleButton`:

```tsx
import { useState, type ReactElement } from 'react'
import { Text, View } from 'react-native'
import { AppleAuth, AppleButton } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/callback',
})

export default function App(): ReactElement {
  const [status, setStatus] = useState('Signed out')

  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 16, padding: 24 }}>
      <AppleButton
        buttonStyle="black"
        buttonType="signIn"
        onSuccess={(credential) => setStatus(`Apple user ${credential.user.id ?? 'unknown'}`)}
        onCancel={() => setStatus('Canceled')}
        onError={(error) => setStatus(`Sign-in failed: ${error.code}`)}
      />
      <Text>{status}</Text>
    </View>
  )
}
```

`AppleAuth.signIn()`, which the button calls, returns the same credential on every platform. It hashes the nonce with SHA-256 before sending it to Apple and puts the raw nonce on `credential.nonce`, which is the value Supabase and Firebase check against the identity token. Do not hash it again.

## Providers

Each adapter runs Sign in with Apple and hands the result to your auth service in one call:

- [Supabase](https://smartsquad.github.io/expo-apple-sign-in/providers/supabase.html): `signInWithSupabase(supabase)` from `expo-apple-sign-in/supabase` calls `signInWithIdToken` with the identity token and the raw nonce.
- [Clerk](https://smartsquad.github.io/expo-apple-sign-in/providers/clerk.html): `signInWithClerk({ signIn, signUp, setActive })` from `expo-apple-sign-in/clerk` sends the identity token with the `oauth_token_apple` strategy and follows Clerk's transfer step when the Apple ID already has a Clerk user.
- [Firebase](https://smartsquad.github.io/expo-apple-sign-in/providers/firebase.html): `signInWithFirebase(signInWithCredential)` from `expo-apple-sign-in/firebase` passes the identity token and the raw nonce to your Firebase sign-in function.

## Why this package

Sign in with Apple works differently on each platform: iOS shows a native sheet, while Android and web have to go through Apple's web flow with a Services ID. This package puts those paths behind one call and one credential shape, so the code that talks to your backend is the same on iOS, Android and web. It also handles the nonce for you and ships adapters for the three common auth providers. The [comparison](https://smartsquad.github.io/expo-apple-sign-in/comparison.html) shows how it relates to other Sign in with Apple packages for React Native and Expo.

## Documentation

The [documentation site](https://smartsquad.github.io/expo-apple-sign-in/) covers [requirements](https://smartsquad.github.io/expo-apple-sign-in/getting-started/requirements.html), the [Apple Developer setup](https://smartsquad.github.io/expo-apple-sign-in/setup/apple-developer.html) for each platform, [usage](https://smartsquad.github.io/expo-apple-sign-in/guides/usage.html), [backend verification](https://smartsquad.github.io/expo-apple-sign-in/guides/backend.html), the [API reference](https://smartsquad.github.io/expo-apple-sign-in/reference/api.html) and [troubleshooting](https://smartsquad.github.io/expo-apple-sign-in/reference/troubleshooting.html). The `example` folder contains a single-screen app that runs on all three platforms.

## License

[MIT](LICENSE), copyright Massimo De Luisa.
