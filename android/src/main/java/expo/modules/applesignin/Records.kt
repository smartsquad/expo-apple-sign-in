package expo.modules.applesignin

import io.github.expo.modules.v2.Record

/**
 * Options passed from JavaScript to `signIn`. `clientId` is the Apple Services ID and, together with
 * `redirectUri`, is required on Android. A missing value surfaces as `ERR_NOT_CONFIGURED`.
 */
@Record
data class SignInOptions(
  val nonce: String? = null,
  val state: String? = null,
  val scopes: List<String> = listOf("fullName", "email"),
  val clientId: String? = null,
  val redirectUri: String? = null,
)

/**
 * Credential returned to JavaScript by a successful `signIn`, with the same shape as the iOS record.
 * The WebView flow never fills `middleName`, `namePrefix`, `nameSuffix`, or `nickname`.
 */
@Record
data class AppleCredentialRecord(
  val identityToken: String? = null,
  val authorizationCode: String? = null,
  val user: String? = null,
  val email: String? = null,
  val givenName: String? = null,
  val familyName: String? = null,
  val middleName: String? = null,
  val namePrefix: String? = null,
  val nameSuffix: String? = null,
  val nickname: String? = null,
  val state: String? = null,
  val realUserStatus: String = "unknown",
)
