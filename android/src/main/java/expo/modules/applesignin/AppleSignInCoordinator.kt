package expo.modules.applesignin

import android.app.Application
import android.content.Intent
import java.util.UUID
import kotlinx.coroutines.CompletableDeferred

object AppleSignInCoordinator {
  const val EXTRA_CLIENT_ID = "expo.modules.applesignin.CLIENT_ID"
  const val EXTRA_REDIRECT_URI = "expo.modules.applesignin.REDIRECT_URI"
  const val EXTRA_NONCE = "expo.modules.applesignin.NONCE"
  const val EXTRA_STATE = "expo.modules.applesignin.STATE"
  const val EXTRA_SCOPES = "expo.modules.applesignin.SCOPES"

  @Volatile
  var pending: CompletableDeferred<AppleCredentialRecord>? = null

  suspend fun signIn(options: SignInOptions): AppleCredentialRecord {
    val clientId = options.clientId
      ?: throw AppleAuthNativeError(
        "ERR_NOT_CONFIGURED",
        "AppleAuth.configure({ clientId, redirectUri }) is required on Android. clientId is the Apple Services ID."
      )
    val redirectUri = options.redirectUri
      ?: throw AppleAuthNativeError(
        "ERR_NOT_CONFIGURED",
        "AppleAuth.configure({ redirectUri }) is required on Android."
      )

    val application = currentApplication()
      ?: throw AppleAuthNativeError("ERR_REQUEST_FAILED", "No Android application context is available.")

    pending?.cancel()
    val deferred = CompletableDeferred<AppleCredentialRecord>()
    pending = deferred

    val scopes = options.scopes.joinToString(" ") { scope ->
      if (scope == "fullName") "name" else scope
    }.ifBlank { "name email" }

    val intent = Intent(application, AppleSignInActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      putExtra(EXTRA_CLIENT_ID, clientId)
      putExtra(EXTRA_REDIRECT_URI, redirectUri)
      putExtra(EXTRA_NONCE, options.nonce)
      putExtra(EXTRA_STATE, options.state ?: UUID.randomUUID().toString())
      putExtra(EXTRA_SCOPES, scopes)
    }
    application.startActivity(intent)
    return deferred.await()
  }

  fun complete(record: AppleCredentialRecord) {
    pending?.complete(record)
    pending = null
  }

  fun fail(error: Throwable) {
    pending?.completeExceptionally(error)
    pending = null
  }

  fun cancel() {
    fail(AppleAuthNativeError("ERR_REQUEST_CANCELED", "The user canceled Apple sign-in."))
  }

  private fun currentApplication(): Application? {
    return try {
      val activityThread = Class.forName("android.app.ActivityThread")
      activityThread.getMethod("currentApplication").invoke(null) as? Application
    } catch (_: Throwable) {
      null
    }
  }
}
