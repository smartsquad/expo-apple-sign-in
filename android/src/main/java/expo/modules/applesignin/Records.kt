package expo.modules.applesignin

import io.github.expo.modules.v2.Record

@Record
data class SignInOptions(
  val nonce: String? = null,
  val state: String? = null,
  val scopes: List<String> = listOf("fullName", "email"),
  val clientId: String? = null,
  val redirectUri: String? = null,
)

@Record
data class AppleCredentialRecord(
  val identityToken: String? = null,
  val authorizationCode: String? = null,
  val user: String? = null,
  val email: String? = null,
  val givenName: String? = null,
  val familyName: String? = null,
  val state: String? = null,
  val realUserStatus: String = "unknown",
)
