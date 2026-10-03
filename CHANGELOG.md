# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

### Changed

- The native binding reads the Expo SDK 58 module host first and falls back to `requireOptionalNativeModule`.
- A missing native module now raises an error that says to rebuild the development client.
