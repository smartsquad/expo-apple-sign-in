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
| iOS | Yes | iOS 16.4 or later, and an App ID with Sign in with Apple enabled. No `AppleAuth.configure` call is needed. |
| Android | Yes | A Services ID as `clientId` and an HTTPS `redirectUri` registered on it. Sign-in runs in an in-app WebView screen. |
| Web | Yes | The same Services ID and a `redirectUri` on the same origin as the page. Sign-in runs in an Apple JS popup. |

## Why only SDK 58

The native modules are written with the Expo Modules 2.0 API that ships with SDK 58, and earlier SDKs do not support it. The Swift and Kotlin modules declare their functions with `@ExpoModule` and `@JS`, the Android build file turns on Modules 2.0 with `expoModule { v2 true }`, and Android registers the module through the Modules 2.0 generated module list. The iOS errors use the SDK 58 `Exception(name:description:code:)` initializer, which is how codes such as `ERR_REQUEST_CANCELED` reach JavaScript. The library has no code path for the older module API, so it cannot fall back on an earlier SDK.

## Web browser notes

On web the library has no native module. It drives Apple's JavaScript SDK in the browser, and a few details of that path affect where and how it runs.

`AppleAuth.isAvailable()` returns `true` whenever the code runs with a browser `document`, and `false` where there is none, such as in Node. It does not check that Apple's script can load, so a `true` result does not guarantee that sign-in will start.

The first call to `AppleAuth.signIn()` adds a `<script>` tag for `https://appleid.apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js` to the page, or waits for that tag if the page already includes it. If the script fails to load, sign-in rejects with `ERR_NOT_AVAILABLE` and the message `Failed to load the Apple JS SDK.` A site that sends a Content Security Policy must allow scripts from `https://appleid.apple.com`.

The library calls Apple JS with `usePopup: true`, so Apple's sign-in page opens in a popup window and the result returns to the page that started it. When Apple JS rejects with an error whose message mentions a closed or canceled popup, or a user cancel, the library reports it as `ERR_REQUEST_CANCELED`, the same code a dismissed sheet produces on iOS.

Before it loads Apple JS, the library checks that `redirectUri` has the same origin as the page and rejects with `ERR_NOT_CONFIGURED` if it does not. Web explains the rule and how to register the matching Return URL.
