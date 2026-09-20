package expo.modules.applesignin

class AppleAuthNativeError(val code: String, message: String) : Exception("$code: $message")
