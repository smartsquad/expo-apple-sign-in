import AuthenticationServices
import ExpoModulesCore

final class RequestCanceledException: Exception, @unchecked Sendable {
  override var name: String { "ERR_REQUEST_CANCELED" }
  override var reason: String { "The user canceled the authorization attempt" }
}

final class InvalidResponseException: Exception, @unchecked Sendable {
  override var name: String { "ERR_INVALID_RESPONSE" }
  override var reason: String { "The authorization request received an invalid response" }
}

final class RequestFailedException: Exception, @unchecked Sendable {
  override var name: String { "ERR_REQUEST_FAILED" }
  override var reason: String { "The authorization attempt failed" }
}

final class RequestUnknownException: Exception, @unchecked Sendable {
  override var name: String { "ERR_REQUEST_UNKNOWN" }
  override var reason: String { "The authorization attempt failed for an unknown reason" }
}

final class WindowUnavailableException: Exception, @unchecked Sendable {
  override var name: String { "ERR_REQUEST_FAILED" }
  override var reason: String {
    "Couldn't present Sign in with Apple because no active window is available"
  }
}

func exceptionForAuthorizationError(_ error: ASAuthorizationError) -> Exception {
  switch error.code {
  case .canceled:
    return RequestCanceledException()
  case .invalidResponse:
    return InvalidResponseException()
  case .failed, .notHandled, .notInteractive:
    return RequestFailedException()
  default:
    return RequestUnknownException()
  }
}
