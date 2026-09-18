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
