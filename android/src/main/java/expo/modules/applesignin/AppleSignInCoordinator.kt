package expo.modules.applesignin

import android.app.Application
import android.content.Intent
import java.util.UUID
import kotlinx.coroutines.CompletableDeferred

/**
 * Connects the module's suspending [signIn] call to [AppleSignInActivity]. At most one request is in
 * flight, and the activity settles it through [complete], [fail], or [cancel].
 */
object AppleSignInCoordinator {
  const val EXTRA_CLIENT_ID = "expo.modules.applesignin.CLIENT_ID"
  const val EXTRA_REDIRECT_URI = "expo.modules.applesignin.REDIRECT_URI"
  const val EXTRA_NONCE = "expo.modules.applesignin.NONCE"
  const val EXTRA_STATE = "expo.modules.applesignin.STATE"
  const val EXTRA_SCOPES = "expo.modules.applesignin.SCOPES"

  @Volatile
  var pending: CompletableDeferred<AppleCredentialRecord>? = null

  /**
   * Starts [AppleSignInActivity] and suspends until it reports a result.
   *
   * Throws [AppleAuthNativeError] with `ERR_NOT_CONFIGURED` when `clientId` or `redirectUri` is missing,
   * and with `ERR_REQUEST_FAILED` when no application context is available or a request is already in
   * progress. The activity can also fail the request with `ERR_REQUEST_CANCELED` or `ERR_INVALID_RESPONSE`.
   */
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

    if (pending?.isActive == true) {
      throw AppleAuthNativeError("ERR_REQUEST_FAILED", "A Sign in with Apple request is already in progress.")
    }
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

  /** Resolves the pending request with [record] and clears it. Does nothing when no request is pending. */
  fun complete(record: AppleCredentialRecord) {
    pending?.complete(record)
    pending = null
  }

  /** Rejects the pending request with [error] and clears it. Does nothing when no request is pending. */
  fun fail(error: Throwable) {
    pending?.completeExceptionally(error)
    pending = null
  }

  /** Rejects the pending request with `ERR_REQUEST_CANCELED`. Does nothing when no request is pending. */
  fun cancel() {
    fail(AppleAuthNativeError("ERR_REQUEST_CANCELED", "The user canceled Apple sign-in."))
  }

  /** Modules 2.0 `ExpoContext` exposes no Android `Context`, so the `Application` comes from `ActivityThread`. */
  private fun currentApplication(): Application? {
    return try {
      val activityThread = Class.forName("android.app.ActivityThread")
      activityThread.getMethod("currentApplication").invoke(null) as? Application
    } catch (_: Throwable) {
      null
    }
  }
}
