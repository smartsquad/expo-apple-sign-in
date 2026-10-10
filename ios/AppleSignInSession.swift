import AuthenticationServices
import ExpoModulesCore
import UIKit

/// Runs one Sign in with Apple request at a time and resolves it with the credential or a typed exception.
///
/// A second `signIn` call while a request is pending throws `RequestInProgressException`, which surfaces in JavaScript as `ERR_REQUEST_FAILED`.
/// Failures from the system map through `exceptionForAuthorizationError`.
final class AppleSignInSession: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
  static let shared = AppleSignInSession()

  private var continuation: CheckedContinuation<AppleCredentialRecord, Error>?
  private var controller: ASAuthorizationController?
  private var presentationWindow: UIWindow?

  func signIn(options: SignInOptions) async throws -> AppleCredentialRecord {
    try await withCheckedThrowingContinuation { continuation in
      if self.continuation != nil {
        continuation.resume(throwing: RequestInProgressException())
        return
      }
      self.continuation = continuation
      self.start(options: options)
    }
  }

  private func start(options: SignInOptions) {
    guard let window = Self.keyWindow() else {
      finish(error: WindowUnavailableException())
      return
    }
    presentationWindow = window

    let request = ASAuthorizationAppleIDProvider().createRequest()
    request.requestedScopes = scopes(from: options.scopes)
    request.requestedOperation = .operationLogin
    request.nonce = options.nonce
    request.state = options.state

    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    self.controller = controller
    controller.performRequests()
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
      finish(error: InvalidResponseException())
      return
    }

    var record = AppleCredentialRecord()
    record.identityToken = string(from: credential.identityToken)
    record.authorizationCode = string(from: credential.authorizationCode)
    record.user = credential.user
    record.email = credential.email
    record.givenName = credential.fullName?.givenName
    record.familyName = credential.fullName?.familyName
    record.middleName = credential.fullName?.middleName
    record.namePrefix = credential.fullName?.namePrefix
    record.nameSuffix = credential.fullName?.nameSuffix
    record.nickname = credential.fullName?.nickname
    record.state = credential.state
    record.realUserStatus = realUserStatus(credential.realUserStatus)
    finish(value: record)
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    if let error = error as? ASAuthorizationError {
      finish(error: exceptionForAuthorizationError(error))
    } else {
      finish(error: RequestUnknownException())
    }
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    presentationWindow ?? UIWindow()
  }

  private func finish(value: AppleCredentialRecord) {
    let pending = continuation
    clear()
    pending?.resume(returning: value)
  }

  private func finish(error: Error) {
    let pending = continuation
    clear()
    pending?.resume(throwing: error)
  }

  private func clear() {
    continuation = nil
    controller = nil
    presentationWindow = nil
  }

  private func scopes(from values: [String]) -> [ASAuthorization.Scope] {
    values.compactMap { value in
      switch value {
      case "email":
        return .email
      case "name", "fullName":
        return .fullName
      default:
        return nil
      }
    }
  }

  private func string(from data: Data?) -> String? {
    guard let data else {
      return nil
    }
    return String(data: data, encoding: .utf8)
  }

  private func realUserStatus(_ status: ASUserDetectionStatus) -> String {
    switch status {
    case .likelyReal:
      return "likelyReal"
    case .unsupported:
      return "unsupported"
    default:
      return "unknown"
    }
  }

  private static func keyWindow() -> UIWindow? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    if let key = scenes.flatMap({ $0.windows }).first(where: { $0.isKeyWindow }) {
      return key
    }
    return scenes.flatMap({ $0.windows }).first
  }
}
