import AuthenticationServices
import ExpoModulesCore

/// The user dismissed the Sign in with Apple sheet. Surfaces in JavaScript as `ERR_REQUEST_CANCELED`.
final class RequestCanceledException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_REQUEST_CANCELED",
      description: "The user canceled the authorization attempt",
      code: "ERR_REQUEST_CANCELED"
    )
  }
}

/// Apple returned a response the library can't use. Surfaces in JavaScript as `ERR_INVALID_RESPONSE`.
final class InvalidResponseException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_INVALID_RESPONSE",
      description: "The authorization request received an invalid response",
      code: "ERR_INVALID_RESPONSE"
    )
  }
}

/// The authorization attempt failed, was not handled, or needed user interaction that was not possible. Surfaces in JavaScript as `ERR_REQUEST_FAILED`.
final class RequestFailedException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_REQUEST_FAILED",
      description: "The authorization attempt failed",
      code: "ERR_REQUEST_FAILED"
    )
  }
}

/// The authorization attempt failed for a reason Apple did not classify. Surfaces in JavaScript as `ERR_REQUEST_UNKNOWN`.
final class RequestUnknownException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_REQUEST_UNKNOWN",
      description: "The authorization attempt failed for an unknown reason",
      code: "ERR_REQUEST_UNKNOWN"
    )
  }
}

/// No window was available to present the sheet. Surfaces in JavaScript as `ERR_REQUEST_FAILED`.
final class WindowUnavailableException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_REQUEST_FAILED",
      description: "Couldn't present Sign in with Apple because no active window is available",
      code: "ERR_REQUEST_FAILED"
    )
  }
}

/// A second `signIn` call arrived while one was still pending. Surfaces in JavaScript as `ERR_REQUEST_FAILED`.
final class RequestInProgressException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_REQUEST_FAILED",
      description: "A Sign in with Apple request is already in progress",
      code: "ERR_REQUEST_FAILED"
    )
  }
}

/// Maps an `ASAuthorizationError` to the exception thrown to JavaScript.
///
/// - `.canceled` becomes `ERR_REQUEST_CANCELED`.
/// - `.invalidResponse` becomes `ERR_INVALID_RESPONSE`.
/// - `.failed`, `.notHandled`, `.notInteractive`, `.matchedExcludedCredential`, `.credentialImport`, `.credentialExport`,
///   `.preferSignInWithApple` and `.deviceNotConfiguredForPasskeyCreation` become `ERR_REQUEST_FAILED`.
/// - `.unknown` and codes added by future SDKs become `ERR_REQUEST_UNKNOWN`.
func exceptionForAuthorizationError(_ error: ASAuthorizationError) -> Exception {
  switch error.code {
  case .canceled:
    return RequestCanceledException()
  case .invalidResponse:
    return InvalidResponseException()
  case .failed, .notHandled, .notInteractive:
    return RequestFailedException()
  case .unknown:
    return RequestUnknownException()
  #if compiler(>=6)
  case .matchedExcludedCredential:
    return RequestFailedException()
  #endif
  /**
   * Xcode 16.2 (Swift 6.0.3) ships the iOS 18.2 SDK, which declares credentialImport and
   * credentialExport. Xcode 26 (Swift 6.2) ships the iOS 26 SDK, which adds preferSignInWithApple
   * and deviceNotConfiguredForPasskeyCreation. None of them apply to an Apple ID request.
   */
  #if compiler(>=6.2)
  case .credentialImport, .credentialExport, .preferSignInWithApple, .deviceNotConfiguredForPasskeyCreation:
    return RequestFailedException()
  #elseif compiler(>=6.0.3)
  case .credentialImport, .credentialExport:
    return RequestFailedException()
  #endif
  @unknown default:
    return RequestUnknownException()
  }
}
