package expo.modules.applesignin

/**
 * Failure with a stable error [code]. The message has the form `CODE: message`, which the JavaScript
 * layer parses back into the matching `AppleAuthError` code, so the format must not change.
 */
class AppleAuthNativeError(val code: String, message: String) : Exception("$code: $message")
