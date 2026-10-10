import AuthenticationServices
import ExpoModulesCore
import Foundation

/// Native side of the `ExpoAppleSignIn` JavaScript module, built on AuthenticationServices.
@ExpoModule("ExpoAppleSignIn")
public class ExpoAppleSignInModule: Module {
  /// Emitted to JavaScript as `credentialRevoked` when the user revokes Sign in with Apple for this app.
  @Event
  var onCredentialRevoked: () -> Void

  private var revokeObserver: NSObjectProtocol?

  /// Always `true`: the podspec targets iOS 16.4, far above the iOS 13 minimum that Sign in with Apple requires.
  @JS
  func isAvailable() -> Bool {
    true
  }

  /// Presents the Sign in with Apple sheet and resolves with the credential.
  ///
  /// Rejects with `ERR_REQUEST_CANCELED` when the user cancels, `ERR_INVALID_RESPONSE` for an unusable response,
  /// `ERR_REQUEST_FAILED` when the attempt fails, no window is available, or another request is in progress,
  /// and `ERR_REQUEST_UNKNOWN` for any other failure.
  @JS
  @MainActor
  func signIn(options: SignInOptions) async throws -> AppleCredentialRecord {
    try await AppleSignInSession.shared.signIn(options: options)
  }

  /// Resolves with `authorized`, `revoked`, `notFound`, `transferred`, or `unknown` for a state this library does not recognize.
  /// It never rejects, so it has no JavaScript error code.
  @JS
  func getCredentialState(userId: String) async -> String {
    await withCheckedContinuation { continuation in
      ASAuthorizationAppleIDProvider().getCredentialState(forUserID: userId) { state, _ in
        switch state {
        case .revoked:
          continuation.resume(returning: "revoked")
        case .authorized:
          continuation.resume(returning: "authorized")
        case .notFound:
          continuation.resume(returning: "notFound")
        case .transferred:
          continuation.resume(returning: "transferred")
        @unknown default:
          continuation.resume(returning: "unknown")
        }
      }
    }
  }

  public override func didStartListening(event: String) {
    guard event == "credentialRevoked", revokeObserver == nil else {
      return
    }
    revokeObserver = NotificationCenter.default.addObserver(
      forName: ASAuthorizationAppleIDProvider.credentialRevokedNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.onCredentialRevoked()
    }
  }

  public override func didStopListening(event: String) {
    guard event == "credentialRevoked" else {
      return
    }
    removeRevokeObserver()
  }

  public override func willDestroy() {
    removeRevokeObserver()
  }

  private func removeRevokeObserver() {
    guard let observer = revokeObserver else {
      return
    }
    NotificationCenter.default.removeObserver(observer)
    revokeObserver = nil
  }
}
