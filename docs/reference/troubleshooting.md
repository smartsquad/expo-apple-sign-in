# Troubleshooting

Most sign-in problems come from one of three places: the native build, the Apple Developer configuration, or the way a value moves from the app to the backend. Each entry below names the symptom, the cause that the library's source or error messages point to, and the fix. If your symptom is an error code, start with the table in [Errors](/guides/errors#codes).

### The native module is not found in Expo Go

Symptom: `AppleAuth.isAvailable()` returns `false`, or `AppleAuth.signIn()` rejects with `ERR_NOT_AVAILABLE` and a message that says the `ExpoAppleSignIn` native module is not linked.

Cause: The library ships a custom native module, and Expo Go does not include it. A development build made before you added the plugin lacks it too. A Metro reload cannot load a native module.

Fix: Add `"expo-apple-sign-in"` to `plugins` and build a development build.

```bash
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```

Web in a browser does not need a native module.

### The Sign in with Apple entitlement is missing

Symptom: Sign in fails on iOS after you added the plugin, or the Sign in with Apple capability is absent from the generated Xcode project.

Cause: The config plugin sets `ios.usesAppleSignIn` and the entitlement `com.apple.developer.applesignin` with the value `Default`. A native project generated earlier does not contain them.

Fix: Regenerate the native projects so that the plugin runs again, then rebuild.

```bash
npx expo prebuild --clean
npx expo run:ios
```

Also enable the capability on the App ID, as described in [Apple Developer](/setup/apple-developer).

### ERR_NOT_CONFIGURED on Android or web

Cause: Android and web sign in through a Services ID. `clientId` or `redirectUri` is missing from `AppleAuth.configure` or from the options of `useAppleAuth`. iOS does not need either value.

Fix: Configure both values before the first sign-in.

```ts [lib/apple-auth.ts]
import { AppleAuth } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/apple',
})
```

`clientId` is the Services ID. `redirectUri` is an HTTPS URL registered for it. Check `AppleAuth.isConfigured()` to see whether both are set. See [Android](/setup/android) and [Web](/setup/web).

### Apple shows invalid_client or a redirect mismatch

Symptom: The Apple page in the Android WebView or the web popup reports `invalid_client`, or an error about the redirect URL, instead of the sign-in form.

Cause: On Android the library sends `clientId` as `client_id` and `redirectUri` as `redirect_uri` to `https://appleid.apple.com/auth/authorize`, unchanged. Apple compares them with the Services ID and the Return URLs registered in the Developer portal. A `clientId` that is not a registered Services ID, or a `redirectUri` that is not registered as a Return URL on that Services ID, fails this comparison.

Fix: Open the Services ID in the Apple Developer portal, open its Sign in with Apple configuration, and register the exact domain and Return URL that you pass as `redirectUri`. The values must match character by character, including the scheme and the path. Then compare the `clientId` in your code with the Services ID. See [Apple Developer](/setup/apple-developer).

### Web redirect URI points at another origin

Symptom: On web, sign-in fails before Apple opens with `ERR_NOT_CONFIGURED` and a message that the web `redirectUri` origin must match the page, or the popup lands on a different host than your app.

Cause: In popup mode, Apple posts the result to `redirectUri`, and that page must hand the result back to the page that opened the popup. The library checks that the origin of `redirectUri` equals the origin of the current page. An address on the main site, such as `example.com`, does not match an app served from a subdomain, such as `web.example.com`.

Fix:

1. Register `https://web.example.com/auth/apple`, the address on the host that serves your web app, as a Return URL on the Services ID.
2. Pass that URL to `AppleAuth.configure` on web. Do not reuse the redirect that Android uses if it lives on another host.
3. Reload the web app.

Because the value differs by platform, choose it per platform when you configure:

```ts [lib/apple-auth.ts]
import { AppleAuth } from 'expo-apple-sign-in'
import { Platform } from 'react-native'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri:
    Platform.OS === 'web' ? 'https://web.example.com/auth/apple' : 'https://example.com/auth/apple',
})
```

### Name or email is null after the first sign-in

Cause: Apple sends the name and the email only the first time a person authorizes your app. Later sign-ins return `null` for `givenName` and `familyName`. The name is never inside the identity token. The library fills `user.id` and `user.email` from the token when it can, so the email usually remains.

Fix: Store the name in the first response, as shown in [Usage](/guides/usage#what-the-credential-contains). To test the first-time flow again, open Settings on the device, then Apple ID, then Sign in with Apple, choose your app, and stop using Apple ID with it. The next sign-in counts as a first authorization.

### Supabase rejects the nonce

Cause: The library already hashes the nonce with SHA-256 before Apple sees it, and it returns the raw value on `credential.nonce`. Supabase hashes the raw value again and compares it with the nonce claim in the token. If you hash `credential.nonce` yourself and pass the digest, the comparison fails.

Fix: Pass `credential.nonce` unchanged.

```ts [lib/supabase-sign-in.ts]
import { createClient } from '@supabase/supabase-js'
import { AppleAuth } from 'expo-apple-sign-in'

const supabase = createClient('https://example.supabase.co', 'public-anon-key')

export async function signInToSupabase(): Promise<void> {
  const credential = await AppleAuth.signIn()

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: credential.nonce,
  })

  if (error) {
    throw error
  }
}
```

`signInWithSupabase` does exactly this. See [Supabase](/providers/supabase), including the Client IDs field in the Supabase dashboard.

### The iOS Simulator cannot sign in

Symptom: The Apple sheet fails to complete on the iOS Simulator, usually as `ERR_REQUEST_FAILED`.

Cause: The system can report `failed`, `notHandled`, or `notInteractive` for a sign-in that cannot proceed, and the library maps all three to `ERR_REQUEST_FAILED`. A simulator without an Apple ID signed in cannot complete the flow.

Fix: Sign in to an Apple ID in the Settings app of the simulator, or test on a physical device.

### ERR_NOT_AVAILABLE on web

Cause: The page has no browser document, or the Apple JS SDK did not load or did not initialize. A content blocker or a Content Security Policy that blocks `appleid.apple.com` prevents the script from loading.

Fix: Allow scripts from `appleid.apple.com` and check the network tab for the SDK request.
