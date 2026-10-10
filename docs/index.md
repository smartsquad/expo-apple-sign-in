---
layout: home

hero:
  name: expo-apple-sign-in
  text: Sign in with Apple for Expo SDK 58
  tagline: One API and one Apple-style button for iOS, Android and web, with adapters for Supabase, Clerk and Firebase.
  image:
    light: /logo-light.svg
    dark: /logo-dark.svg
    alt: Expo Apple Sign In
  actions:
    - theme: brand
      text: Start with Quick Start
      link: /getting-started/quick-start
    - theme: alt
      text: Installation guide
      link: /getting-started/installation

features:
  - title: One API on three platforms
    details: AppleAuth.signIn(), the useAppleAuth hook and AppleButton have the same API on iOS, Android and web, and every platform returns the same credential shape.
  - title: The nonce is hashed for you
    details: Apple receives the SHA-256 hash of the nonce, and the credential carries the raw value that Supabase and Firebase check against the identity token.
  - title: Apple-style button on every platform
    details: AppleButton draws the Apple mark with the official labels in black, white and outlined styles, from one component on iOS, Android and web.
  - title: Supabase, Clerk and Firebase adapters
    details: One call runs Sign in with Apple and passes the identity token, plus the raw nonce where the provider needs it, to your auth service.
  - title: Native code on Expo Modules 2.0
    details: Swift and Kotlin modules written with @ExpoModule and @JS. iOS uses AuthenticationServices, and Android runs Apple's web flow in an in-app screen.
  - title: Typed errors and a React hook
    details: Failures carry stable codes such as ERR_REQUEST_CANCELED, and useAppleAuth exposes loading, error and credential state for custom buttons.
---

<div class="platform-badges">
  <span class="platform-badge">iOS</span>
  <span class="platform-badge">Android</span>
  <span class="platform-badge">Web</span>
  <span class="platform-badge">Expo SDK 58</span>
  <span class="platform-badge">Modules 2.0</span>
</div>

<p class="sdk-notice"><strong>Requires Expo SDK 58.</strong> expo-apple-sign-in is built on Expo Modules 2.0, which earlier SDKs do not support, and Expo Go cannot load it, so iOS and Android need a development build.</p>

## Sign in with one component

Add `"expo-apple-sign-in"` to the `plugins` in `app.json`, build a development client, and render `AppleButton`. iOS signs in with your App ID; Android and web use the Services ID and redirect URI passed to `AppleAuth.configure`. The [Quick start](/getting-started/quick-start) walks through each step.

```tsx [App.tsx]
import { useState, type ReactElement } from 'react'
import { Text, View } from 'react-native'
import { AppleAuth, AppleButton } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/callback',
})

export default function App(): ReactElement {
  const [userId, setUserId] = useState<string | null>(null)

  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 16, padding: 24 }}>
      <AppleButton onSuccess={(credential) => setUserId(credential.user.id)} />
      <Text>{userId ? `Apple user ${userId}` : 'Signed out'}</Text>
    </View>
  )
}
```
