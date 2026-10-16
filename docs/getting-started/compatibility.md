# Compatibility

`expo-apple-sign-in` runs on iOS, Android and web in Expo SDK 58 projects that use development builds or EAS Build. The table below shows which environments work and what each one needs, and the sections after it explain the SDK 58 limit and the browser behavior on web.

## Support table

| Environment | Supported | Notes |
| --- | --- | --- |
| Expo SDK 58 | Yes | The only SDK the library targets. |
| Expo SDK 57 and earlier | No | These SDKs lack the Expo Modules 2.0 API that the native code is written with. |
| Expo Go | No | Expo Go cannot load the library's native module, `ExpoAppleSignIn`. |
| Development builds | Yes | Build with `npx expo run:ios` or `npx expo run:android` after adding the config plugin. |
| EAS Build | Yes | EAS runs the config plugin when it generates the native projects. |
| iOS | Yes | iOS 16.4 or later, and an App ID with Sign in with Apple enabled. No `AppleAuth.configure` call is needed, and `AppleAuth.isConfigured()` always returns `true`. |
| Android | Yes | A Services ID as `clientId` and an HTTPS `redirectUri` registered on it. Sign-in runs in an in-app WebView screen. |
| Web | Yes | The same Services ID and a `redirectUri` on the same origin as the page. By default sign-in runs in an Apple JS popup, which must open from a click or press handler. With `webMode: 'redirect'` or `'auto'` the tab goes to Apple, and a server route that accepts POST at `redirectUri` answers it. |

Some behavior differs by platform. Only iOS reports a credential state and revocation: on Android and web, `AppleAuth.getCredentialState` always returns `'unknown'`, and `AppleAuth.addRevokeListener` returns a subscription whose listener never runs. Only iOS fills `middleName`, `namePrefix`, `nameSuffix`, and `nickname`, and the other platforms return `null` for them. iOS and Android run one sign-in at a time, so a second `signIn` call while the first is open rejects with `ERR_REQUEST_FAILED`.

## Why only SDK 58

The native modules are written with the Expo Modules 2.0 API that ships with SDK 58, and earlier SDKs do not support it. The Swift and Kotlin modules declare their functions with `@ExpoModule` and `@JS`, the Android build file turns on Modules 2.0 with `expoModule { v2 true }`, and Android registers the module through the Modules 2.0 generated module list. The iOS errors use the SDK 58 `Exception(name:description:code:)` initializer, which is how codes such as `ERR_REQUEST_CANCELED` reach JavaScript. The library has no code path for the older module API, so it cannot fall back on an earlier SDK.

## Web browser notes

On web the library has no native module. By default it drives Apple's JavaScript SDK in the browser, and a few details of that path affect where and how it runs. `webMode: 'redirect'` and `'auto'` take a different path, described after the popup notes.

`AppleAuth.isAvailable()` returns `true` whenever the code runs with a browser `document`, and `false` where there is none, such as in Node. It does not check that Apple's script can load, so a `true` result does not guarantee that sign-in will start.

The first call to `AppleAuth.signIn()` adds a `<script>` tag for `https://appleid.apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js` to the page, or waits for that tag if the page already includes it. If the script fails to load, sign-in rejects with `ERR_NOT_AVAILABLE` and the message `Failed to load the Apple JS SDK.`, and the library removes the tag so the next call tries to load the script again. A site that sends a Content Security Policy must allow scripts from `https://appleid.apple.com`.

In popup mode the library calls Apple JS with `usePopup: true`, so Apple's sign-in page opens in a popup window and the result returns to the page that started it. Browsers block a popup that no user gesture opened, so call `AppleAuth.signIn()` from a click or press handler. The library passes `redirectUri` to Apple JS unchanged.

When Apple JS rejects, the library maps its error code. `popup_closed_by_user`, `user_cancelled_authorize`, and any other code that contains `cancel` or `closed` become `ERR_REQUEST_CANCELED`, the same code a dismissed sheet produces on iOS. `popup_blocked_by_browser` becomes `ERR_REQUEST_FAILED`, and any other code becomes `ERR_REQUEST_UNKNOWN` with the message `Apple sign-in failed: <code>`.

Before it loads Apple JS or leaves for Apple, the library checks that `redirectUri` has the same origin as the page and rejects with `ERR_NOT_CONFIGURED` if it does not. [Web](/setup/web) explains the rule and how to register the matching Return URL.

In redirect mode the library stores the pending sign-in in `sessionStorage`, navigates the tab to `https://appleid.apple.com/auth/authorize`, and never loads Apple JS. Apple POSTs the result to `redirectUri`, so the host needs a route that answers a POST, such as `handleAppleWebRedirect` from `expo-apple-sign-in/server`, and a static host is not enough. The result reaches only the tab that started sign-in, because `sessionStorage` is per tab. `webMode: 'auto'` uses redirect when the user agent matches Android, iPhone, iPad or iPod, or a Mac user agent with more than one touch point (iPadOS Safari), and popup elsewhere. In Brave on Android, popup sign-in stopped on Apple's confirm step with `Your request could not be completed because of an error.`, and redirect mode completed sign-in in the same browser. Other phone browsers have not been tested. [Web](/setup/web#choose-a-web-mode) compares the modes.
