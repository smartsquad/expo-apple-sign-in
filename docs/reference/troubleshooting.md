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

Cause: The config plugin writes the entitlement `com.apple.developer.applesignin` with the value `Default`. A native project generated before you added the plugin does not contain it.

Fix: Regenerate the native projects so that the plugin runs again, then rebuild.

```bash
npx expo prebuild --clean
npx expo run:ios
```

Also enable the capability on the App ID, as described in [Apple Developer](/setup/apple-developer).

### Prebuild warns about expo-apple-authentication

Symptom: `npx expo prebuild` prints this warning:

```text
» ios: ios.usesAppleSignIn: Install expo-apple-authentication to enable this feature https://docs.expo.dev/versions/latest/sdk/apple-authentication/#eas-build
```

Cause: The Expo config sets `ios.usesAppleSignIn`. `@expo/prebuild-config` reads that key only in the fallback plugin it registers for `expo-apple-authentication`. When that package is not installed, the fallback prints this warning and changes nothing else. `expo-apple-sign-in` does not read the key, and its own config plugin writes the entitlement.

Fix: Delete `ios.usesAppleSignIn` from `app.json` or `app.config.ts`, keep `"expo-apple-sign-in"` in `plugins`, and run prebuild again.

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

`clientId` is the Services ID. `redirectUri` is an HTTPS URL registered for it. On Android and web, `AppleAuth.isConfigured()` returns `true` once both are set. On iOS it always returns `true`. See [Android](/setup/android) and [Web](/setup/web).

### Apple shows invalid_client or a redirect mismatch

Symptom: The Apple page in the Android WebView or the web popup reports `invalid_client`, or an error about the redirect URL, instead of the sign-in form.

Cause: On Android the library sends `clientId` as `client_id` and `redirectUri` as `redirect_uri` to `https://appleid.apple.com/auth/authorize`, unchanged. Apple compares them with the Services ID and the Return URLs registered in the Developer portal. On web the library passes `redirectUri` to Apple JS, or to the authorize URL in redirect mode, unchanged. A `clientId` that is not a registered Services ID, or a redirect URL that is not registered as a Return URL on that Services ID, fails this comparison.

Fix: Open the Services ID in the Apple Developer portal, open its Sign in with Apple configuration, and register the exact domain and Return URL that you pass as `redirectUri`. The values must match character by character, including the scheme and the path. Then compare the `clientId` in your code with the Services ID. See [Apple Developer](/setup/apple-developer).

### Web redirect URI points at another origin

Symptom: On web, sign-in fails before Apple opens with `ERR_NOT_CONFIGURED` and a message that the web `redirectUri` origin must match the page, or the popup lands on a different host than your app.

Cause: Apple posts the result to the redirect URL, and that page must hand the result back to the page that started sign-in: to the opener in popup mode, and to the same tab in redirect mode. The library checks that the origin of `redirectUri` equals the origin of the current page in both modes. An address on the main site, such as `example.com`, does not match an app served from a subdomain, such as `web.example.com`. A Supabase callback URL such as `https://<project>.supabase.co/auth/v1/callback` is on another origin too, so the same check rejects it on web.

Fix:

1. Register `https://web.example.com/auth/apple`, the address on the host that serves your web app, as a Return URL on the Services ID.
2. Pass that URL to `AppleAuth.configure` on web. Do not reuse the redirect that Android uses if it lives on another host.
3. Reload the web app.

The library signs in with the identity token, so web does not need Supabase's callback URL. Use a Return URL on the web app's origin instead.

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

Cause: Apple sends the name and the email only the first time a person authorizes your app. Later sign-ins return `null` for every name field: `givenName`, `familyName`, `middleName`, `namePrefix`, `nameSuffix`, and `nickname`. The name is never inside the identity token. The library fills `user.id` and `user.email` from the token when it can, so the email usually remains.

Fix: Store the name in the first response, as shown in [Usage](/guides/usage#what-the-credential-contains). To test the first-time flow again, open Settings on the device, tap your name, tap Sign in with Apple, select your app, then tap Delete. On Android or web, open account.apple.com, select Sign-In & Security, then Sign in with Apple, and remove the app there. The next sign-in counts as a first authorization.

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

Cause: The system can report `failed`, `notHandled`, or `notInteractive` for a sign-in that cannot proceed, and the library maps all three to `ERR_REQUEST_FAILED`. A simulator without an Apple Account signed in cannot complete the flow.

Fix: Sign in with an Apple Account in the Settings app of the simulator, or test on a physical device.

### A second sign-in rejects with ERR_REQUEST_FAILED

Symptom: On iOS or Android, `AppleAuth.signIn()` rejects with `ERR_REQUEST_FAILED` and a message that contains `A Sign in with Apple request is already in progress`.

Cause: The native module runs one sign-in at a time. A call made while the Apple sheet or the Android sign-in screen is still open rejects at once, and the first request continues.

Fix: Start a new sign-in only after the previous one settles. `AppleButton` ignores presses while its own sign-in runs, but it does not track a custom `onPress` handler, so set `disabled` while your handler runs. With `useAppleAuth`, disable your control while `isLoading` is `true`.

### ERR_NOT_AVAILABLE on web

Cause: The page has no browser document, or the Apple JS SDK did not load or did not initialize. A content blocker or a Content Security Policy that blocks `appleid.apple.com` prevents the script from loading.

Fix: Allow scripts from `appleid.apple.com` and check the network tab for the SDK request. After a failed load the library removes the script tag, so the next call to `AppleAuth.signIn()` requests Apple JS again.

### The browser blocks the Apple popup

Symptom: On web in popup mode, `AppleAuth.signIn()` rejects with `ERR_REQUEST_FAILED` and the message `The browser blocked the Apple sign-in popup. Call signIn from a click handler.`

Cause: Browsers open a popup only in response to a user gesture such as a click. When `signIn` runs from an effect or a timer, the browser blocks the window and Apple JS rejects with `popup_blocked_by_browser`.

Fix: Call `AppleAuth.signIn()`, or the `signIn` function from `useAppleAuth`, inside the press or click handler. Without an `onPress` prop, `AppleButton` calls `AppleAuth.signIn()` from its own press handler.

### Apple's page stops with an error in a phone browser

Symptom: In a phone browser, popup sign-in stops on Apple's confirm step with `Your request could not be completed because of an error.` This was seen in Brave on Android. Other phone browsers have not been tested.

Cause: Not diagnosed. Apple's page shows only this generic message. The failure happens with the default `webMode`, `'popup'`, which opens Apple's page in a popup window, while redirect mode, which sends the whole tab to Apple, completed sign-in in the same browser.

Fix: Set `webMode: 'auto'`, which uses redirect on phones and tablets and the popup elsewhere, and add a route that answers Apple's POST at `redirectUri`. See [Choose a web mode](/setup/web#choose-a-web-mode) and [Answer Apple's POST](/setup/web#answer-apple-s-post).

```ts [lib/apple-auth.ts]
import { AppleAuth } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/callback',
  webMode: 'auto',
})
```

### Sign-in returns to the app but nothing happens

Symptom: In redirect mode, Apple's page finishes and the browser returns to the app, but no credential arrives and no callback runs.

Cause: One of these applies.

- The page the user returns to renders neither `AppleButton` nor `useAppleAuth`, and it does not check `AppleAuth.hasWebRedirectResult()`, so nothing asks for the result.
- The result came back in another tab. `sessionStorage` belongs to one tab, so the tab that started sign-in never receives it, and the other tab reports `ERR_REQUEST_FAILED` with `Apple sign-in returned to a tab with no pending sign-in. Start the sign-in again from this tab.`
- The browser blocks `sessionStorage`, or the storage was cleared between the redirect and the return.
- Something already took the result. The library delivers it once, and the first `AppleButton` or `useAppleAuth` to mount, or the first call to `signIn` or `request`, claims it.

Fix: Render `AppleButton` or `useAppleAuth` on the page that starts sign-in, or check `AppleAuth.hasWebRedirectResult()` at startup and call `AppleAuth.signIn()` or your adapter when it is `true`, as [Usage](/guides/usage#pick-up-a-web-redirect-result) shows. Start sign-in again from the tab that should receive the result.

### Apple's POST gets 405 or 404

Symptom: After the person confirms on Apple's page, the browser shows a 405 or a 404 from your host instead of returning to the app.

Cause: In redirect mode, Apple sends a POST to `redirectUri`, and the host has no route that answers it. A static host serves only GET requests, so it cannot answer the POST. A route at a different path than the registered Return URL gets a 404. In Expo Router, API routes are off unless `web.output` is `server`, or `web.output` is `static` with `["expo-router", { "apiRoutes": true }]` in `plugins`. `handleAppleWebRedirect` itself answers other methods with 405, so a GET to the route also returns 405.

Fix: Deploy to a host that runs server code. Put the route at the path of `redirectUri`, for example `app/auth/callback+api.ts` for `https://app.example.com/auth/callback`, and set one of the two `app.json` options. See [Answer Apple's POST](/setup/web#answer-apple-s-post).
