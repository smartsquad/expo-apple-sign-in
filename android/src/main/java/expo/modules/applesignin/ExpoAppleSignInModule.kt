package expo.modules.applesignin

import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module

@ExpoModule("ExpoAppleSignIn")
object ExpoAppleSignInModule : Module() {
  @JS
  fun isAvailable(): Boolean = true

  @JS
  suspend fun signIn(options: SignInOptions): AppleCredentialRecord {
    return AppleSignInCoordinator.signIn(options)
  }

  @JS
  fun getCredentialState(@Suppress("UNUSED_PARAMETER") userId: String): String = "unknown"
}
