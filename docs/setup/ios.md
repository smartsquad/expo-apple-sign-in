# iOS

On iOS, `expo-apple-sign-in` calls Apple's AuthenticationServices framework from a Swift module, so the user sees the system's own Sign in with Apple sheet. The request is tied to your app's App ID, which means iOS needs no Services ID, no redirect URI and no `AppleAuth.configure` call. Setup comes down to the config plugin, an App ID with the capability, and a signed development build.

## What the config plugin adds

The `expo-apple-sign-in` plugin makes two changes when `npx expo prebuild` generates the iOS project. First, it writes the Sign in with Apple entitlement into the app's entitlements file:

```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

Second, it sets `CFBundleAllowMixedLocalizations` to `true` in `Info.plist` unless your app already defines that key, so the Sign in with Apple sheet follows the device language.

The plugin takes no options. [Installation](/getting-started/installation) shows where to list it, and [Expo config](/setup/expo) describes the plugin in detail.

## Signing and the capability

An app with this entitlement can only be signed with a provisioning profile whose App ID has Sign in with Apple enabled. Enable the capability on the App ID that matches `ios.bundleIdentifier`, as described in [Apple Developer](/setup/apple-developer), before you build. If signing fails with an error about the `com.apple.developer.applesignin` entitlement, the App ID or its provisioning profile does not include the capability yet.

## What happens during sign-in

On iOS, `AppleAuth.isConfigured()` always returns `true`, and `AppleAuth.isAvailable()` resolves `true` whenever the native module is linked, because the podspec targets iOS 16.4.

When you call `AppleAuth.signIn()` or press `AppleButton`, the library generates a nonce if you did not pass one, hashes it with SHA-256 and passes the hash to the native module. The module builds an Apple ID request with the requested scopes (the library maps `name` and `fullName` to Apple's full name scope, and `email` to the email scope), the hashed nonce and the state, then presents Apple's sheet over the app's key window.

Only one request runs at a time. A second `signIn` call while the sheet is open rejects with `ERR_REQUEST_FAILED` and a message that contains `A Sign in with Apple request is already in progress`.

The credential that comes back carries the identity token, the authorization code, the user identifier, the email and the name when Apple provides them, the state, and Apple's real-user estimate. The name arrives on the first authorization only, split into given name, family name, middle name, prefix, suffix, and nickname. iOS is the only platform that fills `middleName`, `namePrefix`, `nameSuffix`, and `nickname`, and the only one that reports `realUserStatus` values other than `'unknown'`.

Native failures map to the library's error codes:

| Situation | Code |
| --- | --- |
| The user dismissed the sheet | `ERR_REQUEST_CANCELED` |
| Apple returned an invalid response | `ERR_INVALID_RESPONSE` |
| Apple returned a credential without an identity token | `ERR_MISSING_IDENTITY_TOKEN` |
| The request failed, was not handled, or could not show interactive UI | `ERR_REQUEST_FAILED` |
| Apple reported `matchedExcludedCredential`, `credentialImport`, `credentialExport`, `preferSignInWithApple`, or `deviceNotConfiguredForPasskeyCreation` | `ERR_REQUEST_FAILED` |
| No window was available to present the sheet | `ERR_REQUEST_FAILED` |
| A second sign-in started while one was still open | `ERR_REQUEST_FAILED` |
| Apple reported `unknown`, a code added by a later SDK, or an error that is not an `ASAuthorizationError` | `ERR_REQUEST_UNKNOWN` |

The module handles each of the newer codes only when the SDK of the Xcode version that builds the app declares it, as explained in [Native modules](/reference/modules#how-errors-reach-javascript). Of these, `credentialImport`, `credentialExport`, `preferSignInWithApple`, and `deviceNotConfiguredForPasskeyCreation` do not apply to an Apple ID request.

[Errors](/guides/errors) shows how to handle each code in your app.

## Test on a simulator or a device

Sign in with Apple needs an Apple Account on the device that shows the sheet. On a simulator, sign in to an Apple Account in the Settings app first; a physical device that is signed in to an Apple Account works as well. Then build and run:

```bash
npx expo run:ios
```

To run on a connected iPhone instead, add `--device`:

```bash
npx expo run:ios --device
```

[Test locally](/guides/local-testing#test-on-an-iphone) walks through a Release build on an iPhone, including the bundle identifier and signing.

## Check the credential state

The user can stop using Sign in with Apple for your app at any time from their Apple Account settings. `AppleAuth.getCredentialState(userId)` asks Apple for the current state of a user identifier you stored earlier, which lets your app react when access has been revoked:

```ts [appleSession.ts]
import { AppleAuth } from 'expo-apple-sign-in'

export async function isAppleUserAuthorized(userId: string): Promise<boolean> {
  const state = await AppleAuth.getCredentialState(userId)

  return state === 'authorized'
}
```

On iOS the result is `'authorized'`, `'revoked'`, `'transferred'`, or `'notFound'`. It is `'unknown'` for a state the library does not recognize and when the native module is missing. Android and web have no native check, so the method always returns `'unknown'` there.

## Listen for revocation

Apple also notifies a running app when the person revokes access. `AppleAuth.addRevokeListener` turns that notification into a JavaScript callback and returns a subscription:

```ts [appleRevoke.ts]
import { AppleAuth } from 'expo-apple-sign-in'
import type { TAppleEventSubscription } from 'expo-apple-sign-in'

export function clearAppleCredentialOnRevoke(): TAppleEventSubscription {
  return AppleAuth.addRevokeListener(() => {
    void AppleAuth.signOut()
  })
}
```

Call `remove()` on the subscription when you no longer need it. The native module observes Apple's notification only while JavaScript listens for it. The [useAppleAuth hook](/guides/hook#revocation) subscribes for you, and [Usage](/guides/usage#listen-for-revocation) shows a React component that does the same.
