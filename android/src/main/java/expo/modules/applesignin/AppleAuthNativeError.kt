package expo.modules.applesignin

import io.github.expo.modules.v2.JavaScriptThrowable

/**
 * Failure with a stable `ERR_*` [code]. Expo Modules 2.0 copies [code] and the message onto the
 * JavaScript rejection, so `normalizeAppleError` receives both without parsing the message.
 */
class AppleAuthNativeError(override val code: String, message: String) :
  JavaScriptThrowable(message)
