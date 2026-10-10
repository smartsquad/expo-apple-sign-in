# From expo-apple-authentication

This page moves an app from `expo-apple-authentication` to `expo-apple-sign-in`. The two packages cover the same iOS flow, so the migration is a package swap, a config plugin entry, and a rename of the calls and credential fields. The reasons to move are Android and web support, a nonce that the library hashes for you, and ready-made adapters for Supabase, Clerk, and Firebase. The comparison is based on `expo-apple-authentication` 58.0.2 and `expo-crypto` 58.0.6.

## Why migrate

- `expo-apple-authentication` provides Apple authentication for iOS only, as its README states. `expo-apple-sign-in` runs the same `AppleAuth.signIn()` call on iOS, Android, and web. Android and web need a Services ID and an HTTPS redirect URI, which you set once with `AppleAuth.configure`.
- `expo-apple-authentication` passes the `nonce` option to Apple unchanged. Anything that compares the token's nonce claim with a raw value, such as Supabase or Firebase, needs the SHA-256 hash to go to Apple and the raw value to go to the provider, so the app computes the hash itself, usually with `expo-crypto`. `expo-apple-sign-in` hashes the nonce before Apple sees it and returns the raw value on the credential.
- `expo-apple-sign-in` includes `signInWithSupabase`, `signInWithClerk`, `signInWithFirebase`, and `toFirebaseAppleCredential`. See the [Supabase](/providers/supabase), [Clerk](/providers/clerk), and [Firebase](/providers/firebase) pages.

Two differences work against the move. `AppleButton` draws the Apple mark and the official label in JavaScript, while `AppleAuthenticationButton` renders the system `ASAuthorizationAppleIDButton`. The calls `refreshAsync`, `signOutAsync`, and `formatFullName` have no counterpart, as the table below shows. Check both before you commit to the migration.

## Steps

### Swap the package

Remove `expo-apple-authentication` and install `expo-apple-sign-in`. The native module changes, so you need a new development build afterwards. Expo Go cannot load either module. See [Installation](/getting-started/installation).

::: code-group

```sh [npm]
npm uninstall expo-apple-authentication && npx expo install expo-apple-sign-in
```

```sh [yarn]
yarn remove expo-apple-authentication && yarn expo install expo-apple-sign-in
```

```sh [pnpm]
pnpm remove expo-apple-authentication && pnpm expo install expo-apple-sign-in
```

```sh [bun]
bun remove expo-apple-authentication && bunx expo install expo-apple-sign-in
```

:::

### Replace the config plugin

Both packages ship a config plugin that adds the `com.apple.developer.applesignin` entitlement with the value `Default` and sets `CFBundleAllowMixedLocalizations` to `true` unless the app already defines it. Change the entry in your Expo config.

```json [app.json]
{
  "expo": {
    "plugins": ["expo-apple-sign-in"]
  }
}
```

If your Expo config sets `ios.usesAppleSignIn`, remove that key as well. The only reader of the key is the fallback plugin that `@expo/prebuild-config` registers for `expo-apple-authentication`, and once that package is uninstalled, prebuild prints `ios.usesAppleSignIn: Install expo-apple-authentication to enable this feature`. The `expo-apple-sign-in` plugin writes the entitlement without the key. [Troubleshooting](/reference/troubleshooting#prebuild-warns-about-expo-apple-authentication) shows the full warning.

The [Expo config](/setup/expo) page lists the Android and web fields.

### Remove expo-crypto if only the nonce used it

`expo-crypto` appeared in the old flow to create the raw nonce and to hash it. `expo-apple-sign-in` generates a nonce when you omit one, hashes it with its own SHA-256 implementation, and returns the raw value on `credential.nonce`. If nothing else in the app imports `expo-crypto`, uninstall it. Keep it if other code uses it.

### Rename the calls

The table maps each `expo-apple-authentication` export to its replacement.

| expo-apple-authentication | expo-apple-sign-in | Notes |
|---|---|---|
| `isAvailableAsync()` | `AppleAuth.isAvailable()` | Both return `Promise<boolean>`. |
| `signInAsync(options)` | `AppleAuth.signIn(options)` | Rejects with `ERR_REQUEST_CANCELED` on cancel in both. |
| `requestedScopes: [AppleAuthenticationScope.FULL_NAME, AppleAuthenticationScope.EMAIL]` | `scopes: ['name', 'email']` | `'fullName'` is accepted as a synonym of `'name'`. Defaults to `['name', 'email']`. |
| `nonce` | `nonce` | Pass the raw value. The library hashes it. |
| `state` | `state` | A random value is generated when omitted. |
| `getCredentialStateAsync(user)` | `AppleAuth.getCredentialState(userId)` | Returns `'revoked'`, `'authorized'`, `'notFound'`, `'transferred'`, or `'unknown'` instead of `AppleAuthenticationCredentialState`. Android and web always return `'unknown'`. |
| `AppleAuthenticationButton` | `AppleButton` | See the button props below. |
| `credential.user` | `credential.user.id` | A `string \| null` instead of a `string`. |
| `credential.fullName.givenName` | `credential.user.givenName` | |
| `credential.fullName.familyName` | `credential.user.familyName` | |
| `credential.email` | `credential.user.email` | |
| `credential.realUserStatus` | `credential.realUserStatus` | `UNSUPPORTED`, `UNKNOWN`, `LIKELY_REAL` become `'unsupported'`, `'unknown'`, `'likelyReal'`. |
| `credential.identityToken` | `credential.identityToken` | A `string` instead of `string \| null`. A missing token rejects with `ERR_MISSING_IDENTITY_TOKEN`. |
| `credential.authorizationCode` | `credential.authorizationCode` | Still `string \| null`. |
| `addRevokeListener(listener)` | `AppleAuth.addRevokeListener(listener)` | Both return a subscription with `remove()`. On Android and web the listener never runs. |
| `refreshAsync`, `formatFullName` | none | |
| `signOutAsync` | none | `AppleAuth.signOut()` clears only the in-memory credential, so it is not a replacement. |
| `credential.fullName.namePrefix`, `middleName`, `nameSuffix`, `nickname` | `credential.user.namePrefix`, `middleName`, `nameSuffix`, `nickname` | Filled on iOS at the first authorization. Always `null` on Android and web. |
| `error.code === 'ERR_REQUEST_CANCELED'` | `isCancelledError(error)` | Also matches `ERR_CANCELED` and `1001`. |

The button props map as follows.

| AppleAuthenticationButton | AppleButton |
|---|---|
| `buttonType={AppleAuthenticationButtonType.SIGN_IN}` | `buttonType="signIn"` (default) |
| `AppleAuthenticationButtonType.CONTINUE`, `SIGN_UP` | `"continue"`, `"signUp"` |
| `buttonStyle={AppleAuthenticationButtonStyle.BLACK}` | `buttonStyle="black"` (default) |
| `AppleAuthenticationButtonStyle.WHITE`, `WHITE_OUTLINE` | `"white"`, `"whiteOutline"` |
| `cornerRadius` | `cornerRadius` (default 8) |
| `style` with width and height | `width` (default `'100%'`) and `height` (default 48), plus `style` |
| `onPress` | `onPress`, or leave it out and use `onSuccess`, `onError`, and `onCancel` |

`AppleAuthenticationButton` requires `buttonType` and `buttonStyle`, and its documentation says the button does not appear unless `style` gives it a width and a height. `AppleButton` has defaults for all of these.

## Before and after

The old flow hashes the nonce by hand and sends the hash to Apple and the raw value to Supabase.

```tsx [components/AppleSignInBefore.tsx]
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import type { ReactElement } from 'react'
import { View } from 'react-native'

import { supabase } from '../lib/supabase'

export function AppleSignInBefore(): ReactElement {
  const handlePress = async (): Promise<void> => {
    const rawNonce = Crypto.randomUUID()
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      })
      if (credential.identityToken) {
        await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
          nonce: rawNonce,
        })
      }
    } catch (error) {
      if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        throw error
      }
    }
  }

  return (
    <View>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8}
        style={{ width: 200, height: 44 }}
        onPress={handlePress}
      />
    </View>
  )
}
```

The new flow passes no nonce at all. The library creates one, hashes it for Apple, and returns the raw value.

```tsx [components/AppleSignInAfter.tsx]
import { AppleAuth, AppleButton, isCancelledError } from 'expo-apple-sign-in'
import type { ReactElement } from 'react'
import { View } from 'react-native'

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
      <AppleButton onPress={handlePress} width={200} height={44} />
    </View>
  )
}
```

`signInWithSupabase(supabase)` collapses the sign-in and the Supabase call into one line. The [Supabase](/providers/supabase) page shows it with error handling.

::: warning Do not hash the nonce yourself
If you keep the old `Crypto.digestStringAsync` step and pass the hash as `nonce`, the library hashes it a second time. The token then carries a hash of a hash, and Supabase or Firebase reject it. Delete the hashing code and pass the raw value, or pass nothing.
:::

## Android and web

iOS needs no configuration. For Android and web, call `AppleAuth.configure` once at startup with the Services ID as `clientId` and an HTTPS `redirectUri`, as described in [Usage](/guides/usage#configure). The platform pages [Android](/setup/android) and [Web](/setup/web) cover the Apple Developer portal side.
