# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- `package.json` overrides the optional React peers of `@docsearch/react` with the root React versions, so `npm ci` installs from the lock file with both npm 10 and npm 11.

## [1.0.1] - 2026-10-09

### Added

- Documentation site built with VitePress in `docs/`, with the introduction and getting started pages.
- GitHub Pages workflow that publishes the documentation from `main`.
- Setup guides for the Apple Developer portal, iOS, Android, web, and the Expo config.
- Usage, button, hook, error, and backend verification guides, with an `AppleButton` playground.
- Supabase, Clerk, and Firebase guides.
- Example app screenshots for iOS, Android, and web.
- Migration guides from `expo-apple-authentication` and `@invertase/react-native-apple-authentication`.
- Comparison with `expo-apple-authentication`, `@invertase/react-native-apple-authentication`, and `react-apple-signin-auth`.
- API, native module, and troubleshooting reference.
- Agent skill page.

### Changed

- The validation workflow also builds the package and the documentation, and `CONVENTIONS.md`, `AGENTS.md`, and `CONTRIBUTING.md` describe the docs commands.
- `AppleAuth.configure` skips `undefined` values, so options left out of `useAppleAuth` no longer clear a client ID or redirect URI set earlier.
- `signInWithClerk` completes Clerk's transfer step, so an Apple ID that already has a Clerk user gets a session.
- The web `redirectUri` origin error explains the fix without naming specific domains.
- On iOS and Android, `generateNonce` reads its random bytes from Expo's native `uuidv4` function when `crypto.getRandomValues` is missing, and it throws instead of falling back to `Math.random`.
- The example app's Metro config also searches `node_modules/react-native/node_modules`, so iOS and Android builds resolve `@react-native/virtualized-lists`.
- The example app centers the Sign in with Apple button.
- The Android library ships consumer R8 rules that keep `ExpoAppleSignInModule` and the Modules 2.0 runtime classes, so release builds with minification load the native module instead of reporting Sign in with Apple as unavailable.
- The README is a short overview that points to the documentation site.

## [1.0.0] - 2026-10-07

### Added

- Expo module scaffold for Expo SDK 58 and Expo Modules 2.0.
- `generateNonce` and `sha256Hex` nonce helpers.
- `AppleAuthError` with stable codes such as `ERR_REQUEST_CANCELED`, plus `isCancelledError`, `normalizeAppleError`, and the `isSuccessResponse`, `isErrorResponse`, and `isCancelledResponse` guards.
- Identity token decoding that fills the user id and email from the token claims when Apple leaves them out.
- iOS native module on AuthenticationServices, written with `@ExpoModule` and `@JS`.
- JavaScript binding for the `ExpoAppleSignIn` native module.
- Web sign-in through Apple JS in popup mode.
- `AppleAuth` with `configure`, `signIn`, `request`, `isAvailable`, `getCredentialState`, and `signOut`. `signIn` hashes the nonce with SHA-256 for Apple and returns the raw nonce on the credential.
- `useAppleAuth` hook that exposes `signIn`, `signOut`, `credential`, `isLoading`, `error`, and `isAvailable`.
- `AppleButton` with the `black`, `white`, and `whiteOutline` styles and the `signIn`, `continue`, and `signUp` labels, plus `AppleLogo` for the Apple mark.
- Android sign-in through the Services ID web flow in its own activity, written with `@ExpoModule` and `@JS`.
- `signInWithSupabase` adapter, exported from `expo-apple-sign-in/supabase`.
- `signInWithClerk` adapter using the `oauth_token_apple` strategy, exported from `expo-apple-sign-in/clerk`.
- `signInWithFirebase` and `toFirebaseAppleCredential`, exported from `expo-apple-sign-in/firebase`.
- Config plugin that sets `ios.usesAppleSignIn` and adds the Sign in with Apple entitlement.
- Example app for iOS, Android, and web.
- `CONVENTIONS.md`, `AGENTS.md`, and `CONTRIBUTING.md`.
- GitHub Actions validation on `main` and on pull requests into `main`.
- README with install, setup, and usage.
- Agent skill in `skills/expo-apple-sign-in`.
- `expo-apple-sign-in/app.plugin.js` export path.

### Changed

- The native binding reads the Expo SDK 58 module host first and falls back to `requireOptionalNativeModule`.
- A missing native module now raises an error that says to rebuild the development client.
- On web, `redirectUri` must share the origin of the page, which catches apex and subdomain mismatches after Apple's popup returns.
- The example app is a single screen with `AppleButton`, and its README explains that Expo Go is not supported.
- iOS errors use the SDK 58 `Exception(name:description:code:)` initializer, so `ERR_REQUEST_CANCELED` and the other codes reach JavaScript.
- The Android sign-in screen sits below the status bar and the display cutout on edge-to-edge devices.
- Android registers through the Modules 2.0 generated module list, and `expo-module.config.json` no longer lists `android.modules`.
- The config plugin loads `@expo/config-plugins` from the Expo process that requires it, so `file:` and sibling installs work.
- The npm package ships `src` without tests, because the `react-native` and `browser` export conditions point at it.

[Unreleased]: https://github.com/smartsquad/expo-apple-sign-in/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/smartsquad/expo-apple-sign-in/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/smartsquad/expo-apple-sign-in/releases/tag/v1.0.0
