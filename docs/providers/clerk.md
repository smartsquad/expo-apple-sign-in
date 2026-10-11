# Clerk

Clerk can create a session from an Apple identity token through its `oauth_token_apple` strategy. The `signInWithClerk` adapter in `expo-apple-sign-in` gets that token from `AppleAuth.signIn()`, sends it to Clerk through the `signIn` and `signUp` objects you pass in, and activates the resulting session. This page covers the install, the Clerk dashboard settings, a complete component, and the transfer step that returning users depend on. It targets iOS, which is the platform Clerk documents for this strategy. Read the warning on Android and web before you ship those.

Clerk ships its own `useSignInWithApple` hook in `@clerk/expo/apple`. That hook is iOS only and needs `expo-apple-authentication` and `expo-crypto`. The adapter follows the same exchange without either package and uses the same native button as the other platforms.

## Install

Install Clerk's Expo SDK and the secure store that holds the session token.

::: code-group

```sh [npm]
npx expo install @clerk/expo expo-secure-store -- --legacy-peer-deps
```

```sh [yarn]
yarn expo install @clerk/expo expo-secure-store
```

```sh [pnpm]
pnpm expo install @clerk/expo expo-secure-store
```

```sh [bun]
bunx expo install @clerk/expo expo-secure-store
```

:::

::: info Peer dependency range
`@clerk/expo` 4.10.1 declares `expo` as `>=54 <58` in its peer dependencies, so npm reports a conflict on Expo SDK 58 (beta). The adapter does not call any Clerk native code. It only uses the `signIn`, `signUp`, and `setActive` objects from the JavaScript hooks, so `--legacy-peer-deps` lets npm install the package despite the range.
:::

## Configure the Clerk dashboard

1. Open the **Native applications** page, add an iOS application, and enter your **App ID Prefix** (the Apple Team ID) and your **Bundle ID**.
2. Under **SSO connections**, enable **Apple**.
3. Before you go to production, switch the Apple connection to custom credentials. Production instances need your Apple **Services ID**, the **Private Key** (the contents of the `.p8` file including the `BEGIN` and `END` lines), your **Team ID**, and your **Key ID**. Keep the `.p8` file out of your repository and out of the app.

The [Apple Developer](/setup/apple-developer) page explains where the Team ID, Services ID, and key come from.

## Wire up the provider

`ClerkProvider` wraps the app and receives your publishable key and the token cache.

```tsx [app/_layout.tsx]
import { ClerkProvider } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { Slot } from 'expo-router'
import type { ReactElement } from 'react'

export default function RootLayout(): ReactElement {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string}
      tokenCache={tokenCache}>
      <Slot />
    </ClerkProvider>
  )
}
```

## Sign in with Apple

In Clerk's Core 3 SDK, `useSignIn()` from `@clerk/expo` returns the new SignInFuture API, where `create()` returns an `{ error }` object instead of throwing. `signInWithClerk` expects the classic resources, which Clerk still ships at `@clerk/expo/legacy`. Import `useSignIn` and `useSignUp` from there. Both hooks report `isLoaded`, and the resources are usable only after it is `true`.

The component below renders `AppleButton` and runs the adapter from `onPress`. With `onPress` set, the button leaves the sign-in to your handler, so the Apple sheet opens once. `isCancelledError` filters out the case where the user dismisses the sheet.

```tsx [components/AppleSignIn.tsx]
import { useSignIn, useSignUp } from '@clerk/expo/legacy'
import { AppleButton, isCancelledError, signInWithClerk } from 'expo-apple-sign-in'
import { useState, type ReactElement } from 'react'
import { Text, View } from 'react-native'

export function AppleSignIn(): ReactElement {
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn()
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp()
  const [message, setMessage] = useState<string | null>(null)

  const handlePress = async (): Promise<void> => {
    if (!isSignInLoaded || !isSignUpLoaded) {
      return
    }

    setMessage(null)
    try {
      const { createdSessionId } = await signInWithClerk({ signIn, signUp, setActive })
      if (!createdSessionId) {
        setMessage('Clerk did not create a session.')
      }
    } catch (error) {
      if (!isCancelledError(error)) {
        setMessage(error instanceof Error ? error.message : 'Sign in with Apple failed.')
      }
    }
  }

  return (
    <View>
      <AppleButton onPress={handlePress} disabled={!isSignInLoaded || !isSignUpLoaded} />
      {message ? <Text>{message}</Text> : null}
    </View>
  )
}
```

`signInWithClerk` resolves with `{ credential, createdSessionId }`. It calls `setActive({ session })` for you when a session id exists and `setActive` is provided, and `createdSessionId` is `null` when Clerk created no session. The adapter throws an `AppleAuthError` with code `ERR_MISSING_IDENTITY_TOKEN` if Apple returns no token. Pass sign-in options such as `scopes` as the second argument.

## How an existing Apple user gets a session

The adapter first calls `signUp.create({ strategy: 'oauth_token_apple', token, firstName, lastName })`, passing the name Apple returned on the first authorization. When the Apple Account already belongs to a Clerk user, that call succeeds but leaves the external account marked `transferable` and creates no session. The adapter then calls `signIn.create({ transfer: true })` and uses the session of that sign-in, which is the same step Clerk's `useSignInWithApple` performs. Without it, returning users would receive `createdSessionId: null`.

If `signUp.create` throws (for example because the instance restricts sign-ups), the adapter calls `signIn.create({ strategy: 'oauth_token_apple', token })` and returns that session. When that sign-in is itself only `transferable`, the adapter rethrows the original sign-up error so your handler sees the reason sign-up failed.

Clerk verifies the identity token itself, so the adapter sends no nonce to Clerk. The library still hashes the nonce for Apple, which is covered in [Usage](/guides/usage#sign-in).

::: warning Android and web
Clerk documents `oauth_token_apple` for native iOS. On Android and web the token's audience is your Services ID, and Clerk does not document that case. The adapter runs on those platforms, but test sign-in against your own Clerk instance on each platform you ship before you rely on it. The [Android](/setup/android) and [Web](/setup/web) pages cover the platform setup.
:::

## Next steps

- [Errors](/guides/errors) lists the codes `AppleAuthError` can carry.
- [Backend verification](/guides/backend) applies if you also run your own server next to Clerk.
