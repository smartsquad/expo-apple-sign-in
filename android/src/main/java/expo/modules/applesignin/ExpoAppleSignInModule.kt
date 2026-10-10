package expo.modules.applesignin

import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module

/**
 * Android side of the `ExpoAppleSignIn` native module. Sign in runs in a WebView against the Apple
 * authorize endpoint and needs a Services ID plus an HTTPS redirect URI.
 */
@ExpoModule("ExpoAppleSignIn")
object ExpoAppleSignInModule : Module() {
  /** Reports whether Sign in with Apple can run on this platform. Always `true` on Android. */
  @JS
  fun isAvailable(): Boolean = true

  /**
   * Runs the Apple sign-in flow through [AppleSignInCoordinator.signIn] and returns the credential.
   *
   * Rejects with `ERR_NOT_CONFIGURED`, `ERR_REQUEST_FAILED`, `ERR_REQUEST_CANCELED`, or
   * `ERR_INVALID_RESPONSE`.
   */
  @JS
  suspend fun signIn(options: SignInOptions): AppleCredentialRecord {
    return AppleSignInCoordinator.signIn(options)
  }

  /** Android has no credential state API, so this always returns `"unknown"`. It produces no error code. */
  @JS
  fun getCredentialState(@Suppress("UNUSED_PARAMETER") userId: String): String = "unknown"
}
