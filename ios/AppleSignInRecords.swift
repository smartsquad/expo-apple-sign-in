import ExpoModulesCore

@Record
struct SignInOptions {
  var nonce: String?
  var state: String?
  var scopes: [String] = ["fullName", "email"]
  var clientId: String?
  var redirectUri: String?
}

@Record
struct AppleCredentialRecord {
  var identityToken: String?
  var authorizationCode: String?
  var user: String?
  var email: String?
  var givenName: String?
  var familyName: String?
  var state: String?
  var realUserStatus: String = "unknown"
}
