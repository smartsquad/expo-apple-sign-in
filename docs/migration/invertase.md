# From Invertase

This page moves an app from `@invertase/react-native-apple-authentication` to `expo-apple-sign-in`, including the web setup that the Invertase README delegates to `react-apple-signin-auth`. Invertase exposes separate iOS and Android modules, so a cross-platform app usually branches on `Platform.OS`. With `expo-apple-sign-in`, one `AppleAuth.signIn()` call covers iOS, Android, and web. The comparison is based on `@invertase/react-native-apple-authentication` 2.5.1.

## Why migrate

- Invertase has two APIs, `appleAuth` for iOS and `appleAuthAndroid` for Android, and its README sends web projects to a third package, `react-apple-signin-auth`. `expo-apple-sign-in` replaces all three with `AppleAuth.signIn()` and `AppleAuth.configure()`.
- Invertase is not an Expo config plugin. Its README asks you to add the `com.apple.developer.applesignin` entitlement to `app.json` by hand. `expo-apple-sign-in` ships a config plugin that sets it.
- `expo-apple-sign-in` includes adapters for Supabase, Clerk, and Firebase. See the [Supabase](/providers/supabase), [Clerk](/providers/clerk), and [Firebase](/providers/firebase) pages.

The nonce does not change behavior. Invertase already hashes the nonce with SHA-256 before it reaches Apple and returns the raw value, on iOS (it hashes in `RNAppleAuthModule.m` and returns the raw nonce in the response) and on Android (`AppleAuthenticationAndroidModule.java`). `expo-apple-sign-in` does the same, so you keep passing the raw value to your provider. The web example in the Invertase README is different, because it hashes the nonce itself before calling `react-apple-signin-auth`.

Check two differences before you move. `AppleAuth.signIn` always starts a login, so the `IMPLICIT`, `REFRESH`, and `LOGOUT` operations have no counterpart, and the credential has no `authorizedScopes` field. The table below lists both.

## Steps

### Swap the package

Remove `@invertase/react-native-apple-authentication` and install `expo-apple-sign-in`. The native module changes, so you need a new development build afterwards. See [Installation](/getting-started/installation).

::: code-group

```sh [npm]
npm uninstall @invertase/react-native-apple-authentication && npx expo install expo-apple-sign-in
```

```sh [yarn]
yarn remove @invertase/react-native-apple-authentication && yarn expo install expo-apple-sign-in
```

```sh [pnpm]
pnpm remove @invertase/react-native-apple-authentication && pnpm expo install expo-apple-sign-in
```

```sh [bun]
bun remove @invertase/react-native-apple-authentication && bunx expo install expo-apple-sign-in
```

:::

### Replace the entitlement with the config plugin

Delete the `com.apple.developer.applesignin` entry from `ios.entitlements` in your Expo config and add the plugin, which sets the same `Default` value. The plugin also sets `CFBundleAllowMixedLocalizations` to `true` unless your config already defines it, so the Apple sheet follows the device language.

```json [app.json]
{
  "expo": {
    "plugins": ["expo-apple-sign-in"]
  }
}
```

The [Expo config](/setup/expo) page lists the Android and web fields.

### Remove the nonce helpers

The Invertase Android example imports `react-native-get-random-values` and `uuid` to create the nonce and the state. `expo-apple-sign-in` generates both when you omit them, so remove the two packages if nothing else in the app uses them.

### Replace the web package

On web, remove `react-apple-signin-auth`. `AppleAuth.signIn()` loads Apple JS in popup mode by default and returns the same credential as on native. Set `webMode: 'auto'` to use a full-page redirect on phones, which needs a server route at `redirectUri`. Set `clientId` and `redirectUri` through `AppleAuth.configure`, and keep `redirectUri` on the same origin as the page. See [Web](/setup/web). Delete the manual `sha256` call on the nonce, because the library hashes it. In popup mode, call `AppleAuth.signIn()` from a click or press handler, because browsers block a popup that no user gesture opened.

### Rename the calls

The table maps each Invertase export to its replacement.

| Invertase | expo-apple-sign-in | Notes |
|---|---|---|
| `appleAuth.isSupported`, `appleAuthAndroid.isSupported` | `AppleAuth.isAvailable()` | A synchronous `boolean` becomes a `Promise<boolean>`. |
| `appleAuth.isSignUpButtonSupported` | none | `AppleButton` draws its own label, so the `signUp` type needs no check. |
| `appleAuth.performRequest(options)` | `AppleAuth.signIn(options)` | |
| `requestedOperation: appleAuth.Operation.LOGIN` | none | `signIn` always starts a login. `IMPLICIT`, `REFRESH`, and `LOGOUT` have no counterpart. |
| `requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL]` | `scopes: ['name', 'email']` | `'fullName'` is accepted as a synonym of `'name'`. |
| `nonce` | `nonce` | Raw value in both. |
| `nonceEnabled: false` | none | The library always sends a hashed nonce and returns the raw one. |
| `state` | `state` | Generated when omitted. |
| `appleAuthAndroid.configure({ clientId, redirectUri, scope, nonce, state })` | `AppleAuth.configure({ clientId, redirectUri, scopes })` | Call once at startup. `nonce` and `state` move to `signIn`. |
| `responseType`, `fullScreen` | none | |
| `appleAuthAndroid.signIn()` | `AppleAuth.signIn()` | |
| `response.user` (iOS, a string) | `credential.user.id` | A `string \| null`. |
| `response.fullName.givenName`, `familyName` | `credential.user.givenName`, `credential.user.familyName` | |
| `response.fullName.namePrefix`, `middleName`, `nameSuffix`, `nickname` (iOS) | `credential.user.namePrefix`, `middleName`, `nameSuffix`, `nickname` | Filled on iOS at the first authorization. Always `null` on Android and web. |
| `response.user.name.firstName`, `lastName` (Android) | `credential.user.givenName`, `credential.user.familyName` | |
| `response.email`, `response.user.email` (Android) | `credential.user.email` | |
| `response.identityToken`, `response.id_token` (Android) | `credential.identityToken` | A `string` that is never null. A missing token rejects with `ERR_MISSING_IDENTITY_TOKEN`. |
| `response.authorizationCode`, `response.code` (Android) | `credential.authorizationCode` | `string \| null`. |
| `response.nonce` | `credential.nonce` | Raw value. |
| `response.realUserStatus` | `credential.realUserStatus` | `UNSUPPORTED`, `UNKNOWN`, `LIKELY_REAL` become `'unsupported'`, `'unknown'`, `'likelyReal'`. |
| `response.authorizedScopes` | none | |
| `appleAuth.getCredentialStateForUser(user)` | `AppleAuth.getCredentialState(userId)` | Returns `'revoked'`, `'authorized'`, `'notFound'`, `'transferred'`, or `'unknown'` instead of `appleAuth.State`. Invertase throws on Android, while `AppleAuth.getCredentialState` returns `'unknown'` on Android and web. |
| `appleAuth.onCredentialRevoked(listener)` | `AppleAuth.addRevokeListener(listener)` | Invertase returns an unsubscribe function. `addRevokeListener` returns a subscription, so call `subscription.remove()` instead. On Android and web the listener never runs. |
| `appleAuth.Error.CANCELED`, `appleAuthAndroid.Error.SIGNIN_CANCELLED` | `isCancelledError(error)` | `isCancelledError` also matches `1001`, the value of `appleAuth.Error.CANCELED`. |
| `appleAuth.Operation.LOGOUT` | `AppleAuth.signOut()` | Not equivalent. `signOut` clears only the in-memory credential. Invertase's README says its own `LOGOUT` operation does not work as expected and recommends clearing your stored user data. |

The button props map as follows.

| Invertase AppleButton | expo-apple-sign-in AppleButton |
|---|---|
| `buttonStyle={AppleButton.Style.WHITE}` (default), `WHITE_OUTLINE`, `BLACK` | `buttonStyle="white"`, `"whiteOutline"`, `"black"` (default) |
| `buttonType={AppleButton.Type.SIGN_IN}` (default), `CONTINUE`, `SIGN_UP` | `buttonType="signIn"` (default), `"continue"`, `"signUp"` |
| `cornerRadius` | `cornerRadius` (default 8) |
| `style` with width and height | `width` (default `'100%'`) and `height` (default 48), plus `style` |
| `buttonText` (Android only) | `label` |
| `textStyle` (Android only) | `textStyle` |
| `leftView` (Android only) | `children`, which replaces the whole button content |
| `testID` | `testID`, passed to the underlying `Pressable` |
| `onPress` | `onPress`, or leave it out and use `onSuccess`, `onError`, and `onCancel` |

The default `buttonStyle` differs. Invertase defaults to white and `AppleButton` defaults to black, so set `buttonStyle="white"` if you rely on the old default. The Invertase README also requires an explicit width and height in `style`, while `AppleButton` has defaults for both.

## Before and after

The old code branches on the platform, creates its own nonce on Android, and reads different response fields on each.

```tsx [components/AppleSignInBefore.tsx]
import { appleAuth, appleAuthAndroid, AppleButton } from '@invertase/react-native-apple-authentication'
import type { ReactElement } from 'react'
import { Platform, View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuid } from 'uuid'

import { supabase } from '../lib/supabase'

async function signInToSupabase(token: string | null | undefined, nonce: string): Promise<void> {
  if (token) {
    await supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })
  }
}

export function AppleSignInBefore(): ReactElement {
  const handlePress = async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        const response = await appleAuth.performRequest({
          requestedOperation: appleAuth.Operation.LOGIN,
          requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
        })
        await signInToSupabase(response.identityToken, response.nonce)

        return
      }

      const rawNonce = uuid()
      appleAuthAndroid.configure({
        clientId: 'com.example.app.web',
        redirectUri: 'https://app.example.com/auth/apple',
        responseType: appleAuthAndroid.ResponseType.ALL,
        scope: appleAuthAndroid.Scope.ALL,
        nonce: rawNonce,
        state: uuid(),
      })
      const response = await appleAuthAndroid.signIn()
      await signInToSupabase(response.id_token, rawNonce)
    } catch (error) {
      if ((error as { code?: string }).code !== appleAuth.Error.CANCELED) {
        throw error
      }
    }
  }

  return (
    <View>
      <AppleButton
        buttonStyle={AppleButton.Style.WHITE}
        buttonType={AppleButton.Type.SIGN_IN}
        style={{ width: 200, height: 44 }}
        onPress={handlePress}
      />
    </View>
  )
}
```

The new code configures the Services ID once, then runs the same call on every platform.

```ts [lib/apple-auth.ts]
import { AppleAuth } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/apple',
})
```

```tsx [components/AppleSignInAfter.tsx]
import { AppleAuth, AppleButton, isCancelledError } from 'expo-apple-sign-in'
import type { ReactElement } from 'react'
import { View } from 'react-native'

import '../lib/apple-auth'
import { supabase } from '../lib/supabase'

export function AppleSignInAfter(): ReactElement {
  const handlePress = async (): Promise<void> => {
    try {
      const credential = await AppleAuth.signIn({ scopes: ['name', 'email'] })
      await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: credential.nonce,
      })
    } catch (error) {
      if (!isCancelledError(error)) {
        throw error
      }
    }
  }

  return (
    <View>
      <AppleButton buttonStyle="white" onPress={handlePress} width={200} height={44} />
    </View>
  )
}
```

`signInWithSupabase(supabase)` collapses the sign-in and the Supabase call into one line. The [Supabase](/providers/supabase) page shows it with error handling.

::: warning Do not hash the nonce yourself
If you carried over a manual `sha256` step from the web example and pass the hash as `nonce`, the library hashes it a second time. Supabase and Firebase then reject the token. Pass the raw value, or no nonce.
:::
