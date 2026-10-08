# Quick start

Three steps take an installed `expo-apple-sign-in` to a working sign-in on iOS, Android and web: the config plugin, one `AppleAuth.configure` call, and an `App.tsx` that renders `AppleButton` and keeps the credential it returns. It assumes you have finished [Installation](/getting-started/installation) and, for Android and web, created a Services ID and Return URL as described in [Apple Developer](/setup/apple-developer).

## 1. Add the config plugin

List the plugin in `app.json` and rebuild the development client. The plugin enables the Sign in with Apple entitlement for iOS.

```json [app.json]
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

## 2. Configure Android and web

Android and web sign in through Apple's web flow, which identifies your app by a Services ID and sends the result to a registered HTTPS Return URL. Pass both to `AppleAuth.configure` once, before the first sign-in. On iOS the library uses the App ID and ignores these two values, so the same call is safe on every platform.

```ts
import { AppleAuth } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/callback',
})
```

If either value is missing on Android or web, sign-in fails with `ERR_NOT_CONFIGURED`. On web, `redirectUri` must also have the same origin as the page; [Web](/setup/web) explains why.

## 3. Render the button

`AppleButton` runs `AppleAuth.signIn()` when pressed and reports the outcome through `onSuccess`, `onCancel` and `onError`. This `App.tsx` stores a short status line for each outcome:

```tsx [App.tsx]
import { useState, type ReactElement } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppleAuth, AppleButton, type AppleAuthError, type AppleCredential } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/callback',
})

export default function App(): ReactElement {
  const [status, setStatus] = useState('Signed out')

  const handleSuccess = (credential: AppleCredential): void => {
    setStatus(`Signed in as ${credential.user.email ?? credential.user.id ?? 'an Apple user'}`)
  }

  const handleError = (error: AppleAuthError): void => {
    setStatus(`Sign-in failed: ${error.code}`)
  }

  return (
    <View style={styles.container}>
      <AppleButton onSuccess={handleSuccess} onCancel={() => setStatus('Canceled')} onError={handleError} />
      <Text>{status}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
})
```

A dismissed sheet or popup calls `onCancel` instead of `onError`, so cancellation never shows up as a failure. The button defaults to the black style and the `Sign in with Apple` label; [Apple button](/guides/button) covers the other styles, labels and sizes.

## What the credential contains

`onSuccess` receives an `AppleCredential` with the same fields on every platform:

| Field | Type | Contents |
| --- | --- | --- |
| `identityToken` | `string` | The JWT that Apple signed. Send it to your auth provider or your server. |
| `authorizationCode` | `string` or `null` | A single-use code that a server can exchange with Apple for tokens. |
| `nonce` | `string` | The raw nonce. The token's `nonce` claim holds its SHA-256 hash, so pass this value to Supabase or Firebase as it is. |
| `state` | `string` or `null` | The state value Apple sent back. |
| `user.id` | `string` or `null` | Apple's stable identifier for the user, the `sub` claim of the identity token. |
| `user.email` | `string` or `null` | The user's email, which can be a private relay address. |
| `user.givenName`, `user.familyName` | `string` or `null` | The user's name. |
| `realUserStatus` | `'unknown'`, `'likelyReal'` or `'unsupported'` | Apple's estimate of whether the user is a real person. Android and web always report `'unknown'`. |

Apple includes the name and email only the first time a user authorizes your app, so save them on that first sign-in. When Apple leaves out the user id or email, the library reads them from the identity token's claims.

## Next steps

The credential is only useful once a backend trusts it. To sign the user in to an auth service, follow the page for [Supabase](/providers/supabase), [Clerk](/providers/clerk) or [Firebase](/providers/firebase). To verify the token on your own server, read [Backend verification](/guides/backend). For a custom button with loading and error state, use the [useAppleAuth hook](/guides/hook).
