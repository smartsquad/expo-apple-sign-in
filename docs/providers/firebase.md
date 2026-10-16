# Firebase

Firebase Authentication signs a user in with an Apple identity token plus the raw nonce that produced it. `expo-apple-sign-in` does not import a Firebase SDK. It gives you `toFirebaseAppleCredential`, which maps an Apple credential to a plain object, and `signInWithFirebase`, which runs the Apple sign-in and hands that object to a function you write. This page covers the console settings and two ways to write that function, one for the Firebase JS SDK and one for React Native Firebase.

## Configure the Firebase console

Open **Security**, then **Authentication**, then **Sign-in method**, and enable **Apple**.

- Apps that run only on Apple platforms can leave the Services ID, Team ID, private key, and key ID empty.
- Android and web need the Services ID you pass as `clientId` to `AppleAuth.configure`. Under **OAuth code flow configuration**, also enter the Team ID, the private key, and the key ID. The [Apple Developer](/setup/apple-developer) page explains where these values come from, and the private key never belongs in your app or your repository.
- Android also needs the SHA-1 fingerprint of your app registered in the Firebase project.

## How the adapter fits

`toFirebaseAppleCredential(credential)` returns `{ providerId: 'apple.com', token, rawNonce }`, where `token` is the identity token and `rawNonce` is the raw nonce from the credential. `signInWithFirebase(signInWithCredential, options?)` calls `AppleAuth.signIn(options)`, throws an `AppleAuthError` with code `ERR_MISSING_IDENTITY_TOKEN` if Apple returns no token, and then calls the function you pass with that object. It resolves with `{ credential, data }`, where `data` is whatever your function returned.

Firebase compares the hash of `rawNonce` with the `nonce` claim in the token, so `rawNonce` must be the raw value. Do not hash it. Because the adapter calls `AppleAuth.signIn` itself, trigger it from `onPress` of `AppleButton`. When `onPress` is set, the button does not start a second sign-in.

## Firebase JS SDK

With the `firebase` package, create an `OAuthProvider('apple.com')` and build the credential from the token and raw nonce.

::: code-group

```sh [npm]
npx expo install firebase
```

```sh [yarn]
yarn expo install firebase
```

```sh [pnpm]
pnpm expo install firebase
```

```sh [bun]
bunx expo install firebase
```

:::

The sample assumes `lib/firebase.ts` initializes the app. Configure Auth persistence for React Native as the Firebase documentation describes, which the adapter does not depend on.

```ts [lib/firebase.ts]
import { initializeApp } from 'firebase/app'

export const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
})
```

```tsx [components/AppleSignIn.tsx]
import { getAuth, OAuthProvider, signInWithCredential } from 'firebase/auth'
import { AppleButton, isCancelledError, signInWithFirebase } from 'expo-apple-sign-in'
import type { TFirebaseAppleCredential } from 'expo-apple-sign-in'
import { useState, type ReactElement } from 'react'
import { Text, View } from 'react-native'

import { app } from '../lib/firebase'

const signInWithApple = (apple: TFirebaseAppleCredential): Promise<unknown> => {
  const provider = new OAuthProvider(apple.providerId)
  const credential = provider.credential({ idToken: apple.token, rawNonce: apple.rawNonce })

  return signInWithCredential(getAuth(app), credential)
}

export function AppleSignIn(): ReactElement {
  const [message, setMessage] = useState<string | null>(null)

  const handlePress = async (): Promise<void> => {
    setMessage(null)
    try {
      await signInWithFirebase(signInWithApple)
    } catch (error) {
      if (!isCancelledError(error)) {
        setMessage(error instanceof Error ? error.message : 'Sign in with Apple failed.')
      }
    }
  }

  return (
    <View>
      <AppleButton onPress={handlePress} />
      {message ? <Text>{message}</Text> : null}
    </View>
  )
}
```

## React Native Firebase

With `@react-native-firebase/auth`, the credential comes from `AppleAuthProvider.credential(identityToken, nonce)`. Install and configure the app and auth packages as the React Native Firebase documentation describes, then pass the mapped fields to that call.

```tsx [components/AppleSignInNative.tsx]
import { AppleAuthProvider, getAuth, signInWithCredential } from '@react-native-firebase/auth'
import { AppleButton, isCancelledError, signInWithFirebase } from 'expo-apple-sign-in'
import type { TFirebaseAppleCredential } from 'expo-apple-sign-in'
import { useState, type ReactElement } from 'react'
import { Text, View } from 'react-native'

const signInWithApple = (apple: TFirebaseAppleCredential): Promise<unknown> => {
  const credential = AppleAuthProvider.credential(apple.token, apple.rawNonce)

  return signInWithCredential(getAuth(), credential)
}

export function AppleSignIn(): ReactElement {
  const [message, setMessage] = useState<string | null>(null)

  const handlePress = async (): Promise<void> => {
    setMessage(null)
    try {
      await signInWithFirebase(signInWithApple)
    } catch (error) {
      if (!isCancelledError(error)) {
        setMessage(error instanceof Error ? error.message : 'Sign in with Apple failed.')
      }
    }
  }

  return (
    <View>
      <AppleButton onPress={handlePress} />
      {message ? <Text>{message}</Text> : null}
    </View>
  )
}
```

## Use the pieces separately

If you need the Apple credential before you decide to sign in with Firebase, call `AppleAuth.signIn()` yourself and map it with `toFirebaseAppleCredential`. The result has the same shape that `signInWithFirebase` passes to your function.

```ts [lib/apple-to-firebase.ts]
import { AppleAuth, toFirebaseAppleCredential } from 'expo-apple-sign-in'
import type { TFirebaseAppleCredential } from 'expo-apple-sign-in'

export async function getFirebaseAppleCredential(): Promise<TFirebaseAppleCredential> {
  const credential = await AppleAuth.signIn()

  return toFirebaseAppleCredential(credential)
}
```

Apple sends the user's name only on the first authorization. Apple never puts it inside the identity token, so save `credential.user.givenName` and `credential.user.familyName` in your own profile right after the first sign-in. The [Usage](/guides/usage#what-the-credential-contains) page lists every credential field.

## Web redirect mode

With `webMode: 'redirect'` or `'auto'`, web sign-in [leaves the page for Apple](/setup/web#how-redirect-sign-in-works) and returns through a server route. Keep `signInWithFirebase` in the `onPress` of `AppleButton`. The button calls it again when the page loads after the return, and the adapter receives Apple's result without a second sheet. Without `AppleButton`, call `signInWithFirebase` at startup when `AppleAuth.hasWebRedirectResult()` is `true`. [Usage](/guides/usage#pick-up-a-web-redirect-result) has a runnable example.

## Next steps

- [Errors](/guides/errors) lists the codes `AppleAuthError` can carry.
- [Android](/setup/android) and [Web](/setup/web) cover the Services ID and redirect URI that Firebase needs for those platforms.
