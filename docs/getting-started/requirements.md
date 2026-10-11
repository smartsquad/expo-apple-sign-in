# Requirements

`expo-apple-sign-in` needs an Expo SDK 58 (beta) project that runs as a development build, an Apple Developer Program membership, and the Apple identifiers for each platform you ship. Check the list below before you install the package, because a missing identifier only shows up later as a sign-in error.

## Expo, React and React Native

The library targets **Expo SDK 58 (beta)** only. Its Swift and Kotlin modules are written with the Expo Modules 2.0 API, which earlier SDKs do not support, so the package cannot run on SDK 57 or older. The [Compatibility](/getting-started/compatibility) page lists the supported environments.

The package declares `react` and `react-native` as peer dependencies without a version range, so it uses the versions your Expo SDK 58 (beta) project installs. The example app in the repository runs on these versions:

| Package | Version in `example/package.json` |
| --- | --- |
| `expo` | `~58.0.6` |
| `react` and `react-dom` | `19.3.0` |
| `react-native` | `0.88.0-rc.3` |
| `react-native-web` | `~0.21.3` |

## Development build

iOS and Android need a development build that includes the library's native module, `ExpoAppleSignIn`. Expo Go only ships the native modules that are compiled into the Expo Go app, so it cannot load this one. Build with `npx expo run:ios`, `npx expo run:android` or EAS Build, as described in [Installation](/getting-started/installation). Web needs no native module and runs in a browser.

## Platform minimums

| Platform | Minimum | Where it comes from |
| --- | --- | --- |
| iOS | iOS 16.4 | The deployment target in `ios/ExpoAppleSignIn.podspec`. |
| Android | Set by your Expo SDK 58 (beta) project | `android/build.gradle` declares no `minSdkVersion`, `compileSdkVersion` or `targetSdkVersion`. It applies `expo-module-gradle-plugin`, so the module builds with the SDK levels of the app that includes it. |
| Web | A browser page with a `document` | The library adds Apple's JavaScript SDK to the page with a `<script>` tag when sign-in starts. |

## Apple account and identifiers

You need a membership in the Apple Developer Program to enable Sign in with Apple on an App ID and to create Services IDs and keys. Each platform then needs its own identifier:

| Platform | Identifier | Passed to the library as |
| --- | --- | --- |
| iOS | The App ID that matches your bundle identifier, with Sign in with Apple enabled. | Nothing. iOS reads it from the signed app. |
| Android | A Services ID with a domain and an HTTPS Return URL. | `clientId` (the Services ID) and `redirectUri` in `AppleAuth.configure`. |
| Web | The same Services ID, with a Return URL on the same origin as your web app. | `clientId` and `redirectUri` in `AppleAuth.configure`. |

Apple does not accept `localhost` or IP addresses as Services ID domains or Return URLs, so testing Android or web needs an HTTPS host that you can register. [Apple Developer](/setup/apple-developer) walks through creating the App ID setting, the Services ID and, if your server needs one, the Sign in with Apple key.
