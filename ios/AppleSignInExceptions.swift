import AuthenticationServices
import ExpoModulesCore

final class RequestCanceledException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_REQUEST_CANCELED",
      description: "The user canceled the authorization attempt",
      code: "ERR_REQUEST_CANCELED"
    )
  }
}

final class InvalidResponseException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_INVALID_RESPONSE",
      description: "The authorization request received an invalid response",
      code: "ERR_INVALID_RESPONSE"
    )
  }
}

final class RequestFailedException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_REQUEST_FAILED",
      description: "The authorization attempt failed",
      code: "ERR_REQUEST_FAILED"
    )
  }
}

final class RequestUnknownException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_REQUEST_UNKNOWN",
      description: "The authorization attempt failed for an unknown reason",
      code: "ERR_REQUEST_UNKNOWN"
    )
  }
}

final class WindowUnavailableException: Exception, @unchecked Sendable {
  init() {
    super.init(
      name: "ERR_REQUEST_FAILED",
      description: "Couldn't present Sign in with Apple because no active window is available",
      code: "ERR_REQUEST_FAILED"
    )
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
