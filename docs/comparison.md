# Comparison

This page compares `expo-apple-sign-in` 1.1.0 with three packages that React Native and React web apps use for Sign in with Apple: `expo-apple-authentication` 58.0.2, `@invertase/react-native-apple-authentication` 2.5.1, and `react-apple-signin-auth` 1.2.1. It covers platform support, native layers, nonce handling, the JavaScript each package adds to an app bundle, and what an app has to install to reach iOS, Android, and web. Every statement comes from the published package files or from a measurement described in [How we measured](#how-we-measured). The page also lists the cases where another package fits better.

::: info Versions
All figures come from the package versions named above, including the `expo-apple-sign-in` size figures, which were measured on 1.1.0. `expo-apple-sign-in` 1.1.0 is published on npm at [npmjs.com/package/expo-apple-sign-in](https://www.npmjs.com/package/expo-apple-sign-in). `expo-apple-authentication` 58.0.2 is the version bundled with Expo SDK 58 (beta).
:::

## At a glance

| | expo-apple-sign-in 1.1.0 | expo-apple-authentication 58.0.2 | @invertase/react-native-apple-authentication 2.5.1 | react-apple-signin-auth 1.2.1 |
|---|---|---|---|---|
| Platforms | iOS, Android, web (the podspec also lists tvOS 16.4) | iOS | iOS, Android (the podspec also lists macOS 10.15 and visionOS 1.0, and the README describes macOS through `react-native-macos`) | web |
| Native layer | Expo Modules 2.0 macros (`@ExpoModule`, `@JS`) in Swift and Kotlin | Expo Modules `ModuleDefinition` DSL in Swift | Objective-C on iOS, Java and Kotlin on Android, on the React Native bridge | None, browser JavaScript |
| Android sign-in | In-app WebView activity | Not supported | WebView `DialogFragment` | Not supported |
| Config plugin | Yes, sets the entitlement and `CFBundleAllowMixedLocalizations` | Yes, sets the entitlement and `CFBundleAllowMixedLocalizations` | No, the README asks you to add the entitlement to `app.json` by hand | No |
| Button | JavaScript component on iOS, Android, and web | Native `ASAuthorizationAppleIDButton` on iOS | Native button on iOS, JavaScript `TouchableOpacity` button on Android | JavaScript button on web |
| Nonce sent to Apple | SHA-256 hash of the raw nonce, generated when missing | The value you pass, unchanged | SHA-256 hash of the raw nonce on iOS and Android, generated when missing | The value you pass, unchanged |
| Nonce on the credential | Raw nonce | None | Raw nonce | None |
| Credential state API | `AppleAuth.getCredentialState` on iOS, `'unknown'` on Android and web | `getCredentialStateAsync` on iOS, throws `UnavailabilityError` elsewhere | `getCredentialStateForUser` on iOS, throws on Android | None |
| Credential revoked event | `AppleAuth.addRevokeListener` on iOS, a subscription that never fires on Android and web | `addRevokeListener` | `onCredentialRevoked` on iOS, returns an unsubscribe function | None |
| Full name components | All six on iOS, `givenName` and `familyName` on Android and web | All six | All six on iOS, `firstName` and `lastName` on Android | `firstName` and `lastName` |
| Concurrent sign-in | A second call on iOS or Android rejects with `ERR_REQUEST_FAILED` | No check | No check | No check |
| Web popup errors | Mapped to `ERR_REQUEST_CANCELED`, `ERR_REQUEST_FAILED`, or `ERR_REQUEST_UNKNOWN` | Not supported | Not supported | Passed to `onError` unchanged, or to `console.error`, and the call resolves `null` |
| Auth provider adapters | Supabase, Clerk, Firebase | None | None | None |
| React hook | `useAppleAuth` | None | None | `useScript`, which loads Apple's script and does not sign in |
| TypeScript types in the package | Yes | Yes | Yes | Yes |
| License | MIT | MIT | Apache-2.0 | MIT |
| Last npm publish | [1.1.0](https://www.npmjs.com/package/expo-apple-sign-in), 2026-10-10 | 2026-09-29 | 2026-01-09 | 2026-06-02 |

The six name components are `namePrefix`, `givenName`, `middleName`, `familyName`, `nameSuffix`, and `nickname`. Apple sends them only on the first authorization.

The migration pages cover moving an existing app: [From expo-apple-authentication](/migration/expo-apple-authentication) and [From Invertase](/migration/invertase).

## Nonce handling

Sign in with Apple lets the app attach a nonce to the request. Apple copies the value into the `nonce` claim of the identity token, so a server that remembers which nonce it expects can reject a token that was minted for another request, which is the replay protection the nonce exists for. The value Apple receives has to be the SHA-256 hash of a random string, because backends such as Supabase and Firebase take the raw string, hash it themselves, and compare the result with the token claim. The app therefore needs two values: the hash for Apple and the raw string for the backend.

How a package splits the work decides how much code the app has to write:

- `expo-apple-authentication` assigns `options.nonce` to the Apple request without changing it, and the credential it returns has no nonce field. The app generates the raw nonce, hashes it, passes the hash, and keeps the raw value for the backend.
- `@invertase/react-native-apple-authentication` hashes the nonce with SHA-256 on iOS and on Android, generates one when none is given (`nonceEnabled` is on by default), and returns the raw nonce on the credential. Its README documents the automatic hashing. The README example for web hashes the nonce in the caller before passing it to Apple's script, with a `sha256` function the README does not define.
- `react-apple-signin-auth` passes `authOptions`, including `nonce`, to `AppleID.auth.init` unchanged. Hashing is up to the caller.
- `expo-apple-sign-in` generates a random nonce when none is given, hashes it with a SHA-256 implementation written in JavaScript, sends the hash to Apple on every platform, and returns the raw nonce on the credential. Callers pass `credential.nonce` to Supabase or Firebase as is and do not hash it again. The SHA-256 code ships inside the package and the random bytes come from the runtime, so `expo-crypto` is not needed. The random bytes come from `crypto.getRandomValues` when the runtime provides it, as browsers do. React Native and Expo do not install that function by default, so on iOS and Android the package reads the bytes from Expo's native `uuidv4` function, which draws from the system's secure random generator. When neither source exists, the package throws instead of falling back to `Math.random`.

## Package size

The table lists the JavaScript each package adds when its entry is bundled, plus the size of the published package. Native and web columns are separate bundles. The byte counts are exact; gzip sizes use `gzip -9`.

| Package | Native minified (bytes) | Native gzip (bytes) | Web minified (bytes) | Web gzip (bytes) | Unpacked size (bytes) | Files | Runtime dependencies |
|---|---|---|---|---|---|---|---|
| expo-apple-sign-in 1.1.0 | 17,372 | 7,546 | 17,372 | 7,546 | 293,100 | 109 | 0 |
| expo-apple-authentication 58.0.2 | 2,961 | 1,046 | not supported | not supported | 97,227 | 55 | 0 |
| @invertase/react-native-apple-authentication 2.5.1 | 4,365 | 1,879 | not supported | not supported | 131,661 | 40 | 0 |
| react-apple-signin-auth 1.2.1 | not supported | not supported | 5,806 | 2,620 | 42,713 | 20 | 0 |

The `expo-apple-sign-in` bundle is the whole entry point: `AppleAuth`, `useAppleAuth`, `AppleButton`, `AppleLogo`, the error and response helpers, the nonce helpers with the JavaScript SHA-256, and the Supabase, Clerk, and Firebase adapters. The other bundles contain only what their entries export. The Invertase figure does not include `prop-types`, which `lib/AppleButton.ios.js` imports without declaring it in `package.json`. On Android, the Invertase entry resolves to a different button file and measures 4,526 bytes minified and 1,961 bytes gzipped. Every export of each entry is kept in these bundles, so an app that imports a single export may ship less.

The unpacked size and file count of `expo-apple-sign-in` cover the compiled `build` directory, the TypeScript `src` directory, the config plugin in `plugin/src` and `plugin/build`, and the iOS and Android native sources, as listed by `npm pack`.

## Covering iOS, Android, and web

An app that signs in with Apple on all three platforms can use one package or combine several. The options below use only the packages each README or package file points to, with the bundle sizes measured above.

| Option | Packages | Runtime dependencies | Native gzip (bytes) | Web gzip (bytes) | iOS | Android | Web |
|---|---|---|---|---|---|---|---|
| a. expo-apple-sign-in | 1 | 0 | 7,546 | 7,546 | Yes | Yes | Yes |
| b. expo-apple-authentication and react-apple-signin-auth | 2 | 0 | 1,046 | 2,620 | Yes | No | Yes |
| c. Invertase, react-apple-signin-auth, uuid, and react-native-get-random-values | 4 | 1 | 3,487 | 2,620 | Yes | Yes | Yes |

Option b leaves Android uncovered. Neither package signs in on Android, and this comparison does not cover a third package for it.

Option c follows the Invertase README. Its web section tells readers to install `react-apple-signin-auth` (`README.md:253`), and its Android example imports `react-native-get-random-values` and `uuid` to generate the raw nonce and the state (`README.md:207-213`). `react-native-get-random-values` 2.0.0 carries native code and depends on `fast-base64-decode`, which accounts for the one runtime dependency. The native sum adds 1,879 bytes for Invertase, 462 bytes for the `uuid` v4 function (version 14.0.2), and 1,146 bytes for `react-native-get-random-values` with `fast-base64-decode`. With the Android resolution of the Invertase entry the native sum is 3,569 bytes.

The sums count each package once for the target it serves. The native figure for option c assumes the app keeps iOS and Android in separate bundles, as Metro does, and uses the iOS resolution.

## When to choose another package

`expo-apple-sign-in` is not the best fit in these cases:

- Expo SDK 57 or older. `expo-apple-sign-in` declares `expo` `>=58.0.0` as a peer dependency. `expo-apple-authentication` has an `sdk-57` dist-tag that points to 57.0.2.
- React Native without Expo. The `expo` peer dependency is required. `@invertase/react-native-apple-authentication` declares no peer dependencies and works through the React Native bridge.
- An app that targets iOS below 16.4. The `expo-apple-sign-in` podspec sets iOS 16.4 as the minimum. The Invertase podspec sets iOS 9.0, and its JavaScript module reports that Apple authentication works on devices running iOS 13 or later (`lib/AppleAuthModule.js:23-24`).
- macOS or visionOS. The Invertase podspec lists both, and its README documents macOS 10.15 and later through `react-native-macos`. `expo-apple-sign-in` documents iOS, Android, and web, and its podspec adds only tvOS.
- The system Apple button, a credential refresh, or a name formatter. `expo-apple-authentication` renders the system `ASAuthorizationAppleIDButton`, which Apple localizes. `expo-apple-sign-in` draws its button in JavaScript. `expo-apple-authentication` also offers `refreshAsync`, `signOutAsync`, and `formatFullName`. `expo-apple-sign-in` has none of these, and its `signOut` clears the in-memory credential only.
- A web-only React app. `react-apple-signin-auth` needs `react` and `react-dom` as its only peer dependencies, adds 2,620 bytes gzipped in the web bundle, and loads Apple's script from Apple's CDN.
- An iOS-only app that already works. If it hashes its own nonce and uses the system button, a move adds no platform coverage. The [migration page](/migration/expo-apple-authentication) lists what changes.

## Google Sign-In, and Apple without Expo 58 (beta) {#google-sign-in-and-apple-without-expo-58}

This package already signs in with Apple on Android. A Kotlin activity opens Apple's authorize page in a WebView. It does not sign in with Google, and it does not run on Expo SDK 57 or on React Native without Expo.

Two other libraries cover those jobs, and both are good.

[`react-native-nitro-google-signin`](https://react-native-nitro-google-sign-in.github.io/) is Google Sign-In on Nitro Modules. Version 2.3.0 is MIT licensed. Android uses Credential Manager, and iOS uses the Google Sign-In SDK. It is the Google library to install next to this one.

[`@invertase/react-native-apple-authentication`](https://github.com/invertase/react-native-apple-authentication) is Sign in with Apple for React Native, including a separate Android module, `appleAuthAndroid`. Version 2.5.1 is Apache-2.0, copyright Invertase Limited. Use it when the app cannot take Expo SDK 58 (beta). The [migration page](/migration/invertase) is for apps that are leaving it.

## How we measured

The measurements run on the packed tarball of each package, extracted into separate directories. No script from `expo-apple-authentication`, Invertase, `react-apple-signin-auth`, or the helper packages was executed.

| Package | Version | Source |
|---|---|---|
| expo-apple-sign-in | 1.1.0 | `npm run build` and `npm pack` in this repository |
| expo-apple-authentication | 58.0.2 | npm tarball |
| @invertase/react-native-apple-authentication | 2.5.1 | npm tarball |
| react-apple-signin-auth | 1.2.1 | npm tarball |
| uuid | 14.0.2 | `npm pack` (`14.0.3` could not be installed under the local minimum release age) |
| react-native-get-random-values | 2.0.0 | `npm pack`, with `fast-base64-decode` 1.0.0 |

Registry facts come from `npm view <name>@<version> dist.unpackedSize dist.fileCount dependencies peerDependencies license --json` and `npm view <name> time --json`. For `expo-apple-sign-in` the size and file count come from the `npm pack --json` output. The runtime dependency count is the number of keys in `dependencies`, which is absent in all four packages.

Bundles use esbuild 0.28.2 with `--bundle --minify --format=esm --log-level=warning`, the externals `react`, `react-native`, `react-dom`, `expo`, `expo-modules-core`, `react/jsx-runtime`, and `prop-types`, and `--loader:.js=jsx`. The native target adds `--platform=neutral --main-fields=react-native,module,main --resolve-extensions=.ios.js,.native.js,.js,.ios.ts,.native.ts,.ts,.tsx,.json`. The web target adds `--platform=browser --main-fields=browser,module,main --resolve-extensions=.web.js,.js,.web.ts,.ts,.tsx,.json`. The entries are `src/index.ts` for `expo-apple-sign-in`, `build/index.js` for `expo-apple-authentication`, `lib/index.js` for Invertase, and `dist/esm/index.js` for `react-apple-signin-auth`. Gzip sizes are `gzip -9 < bundle.js | wc -c`.

A target is marked "not supported" when the package does not declare it. `expo-apple-authentication` declares the Apple platform in its module config and has no Android or web code. The esbuild web build of Invertase fails because `lib/AppleButton` has no web file, and `react-apple-signin-auth` ships only a browser implementation.
