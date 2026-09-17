import AuthenticationServices
import ExpoModulesCore

@ExpoModule("ExpoAppleSignIn")
public class ExpoAppleSignInModule: Module {
  @JS
  func isAvailable() -> Bool {
    if #available(iOS 13.0, *) {
      return true
    }
    return false
  }

  @JS
  @MainActor
  func signIn(options: SignInOptions) async throws -> AppleCredentialRecord {
    try await AppleSignInSession.shared.signIn(options: options)
  }

  @JS
  func getCredentialState(userId: String) async -> String {
    await withCheckedContinuation { continuation in
      ASAuthorizationAppleIDProvider().getCredentialState(forUserID: userId) { state, _ in
        switch state {
        case .revoked:
          continuation.resume(returning: "revoked")
        case .authorized:
          continuation.resume(returning: "authorized")
        case .transferred:
          continuation.resume(returning: "transferred")
        default:
          continuation.resume(returning: "notFound")
        }
      }
    }
  }
}
