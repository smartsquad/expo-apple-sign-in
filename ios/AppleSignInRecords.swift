import ExpoModulesCore

/// Options passed from JavaScript to `signIn`. `clientId` and `redirectUri` apply to Android and web only.
@Record
struct SignInOptions {
  var nonce: String?
  var state: String?
  var scopes: [String] = ["fullName", "email"]
  var clientId: String?
  var redirectUri: String?
}

/// Credential returned to JavaScript by a successful `signIn`.
///
/// Apple returns the name components on the first authorization only.
@Record
struct AppleCredentialRecord {
  var identityToken: String?
  var authorizationCode: String?
  var user: String?
  var email: String?
  var givenName: String?
  var familyName: String?
  var middleName: String?
  var namePrefix: String?
  var nameSuffix: String?
  var nickname: String?
  var state: String?
  var realUserStatus: String = "unknown"
}
