package expo.modules.applesignin

import android.webkit.JavascriptInterface
import org.json.JSONException
import org.json.JSONObject

/**
 * JavaScript bridge registered on the WebView as [NAME]. It receives the form fields Apple posts to the
 * redirect URI and reports an [AppleCredentialRecord] through [callback].
 *
 * Reports `ERR_INVALID_RESPONSE` when the payload is unreadable or its OAuth state differs from
 * [expectedState], and `ERR_REQUEST_CANCELED` when the fields carry no credential.
 */
internal class FormInterceptor(
  private val expectedState: String,
  private val callback: (Result<AppleCredentialRecord>) -> Unit,
) {
  /**
   * Converts [formData], a JSON object of form field names and values built by [JS_TO_INJECT], into a
   * credential. The WebView calls this on a background thread, and the callback runs exactly once.
   *
   * Produces `ERR_INVALID_RESPONSE` for an unreadable payload or a state mismatch, and
   * `ERR_REQUEST_CANCELED` when `state` is missing or none of `id_token`, `code`, and `user` is present.
   */
  @JavascriptInterface
  fun processFormData(formData: String) {
    val json = try {
      JSONObject(formData)
    } catch (_: JSONException) {
      callback(
        Result.failure(AppleAuthNativeError("ERR_INVALID_RESPONSE", "Apple returned an unreadable form response."))
      )
      return
    }

    val token = stringOrNull(json, "id_token")
    val code = stringOrNull(json, "code")
    val state = stringOrNull(json, "state")
    val userRaw = stringOrNull(json, "user")

    if (state != null && (token != null || code != null || userRaw != null)) {
      if (state != expectedState) {
        callback(Result.failure(AppleAuthNativeError("ERR_INVALID_RESPONSE", "OAuth state does not match.")))
        return
      }
      val names = parseUser(userRaw)
      callback(
        Result.success(
          AppleCredentialRecord(
            identityToken = token,
            authorizationCode = code,
            user = names.userId,
            email = names.email,
            givenName = names.givenName,
            familyName = names.familyName,
            state = state,
            realUserStatus = "unknown",
          )
        )
      )
      return
    }
    callback(Result.failure(AppleAuthNativeError("ERR_REQUEST_CANCELED", "The user canceled Apple sign-in.")))
  }

  private data class ParsedUser(
    val userId: String? = null,
    val email: String? = null,
    val givenName: String? = null,
    val familyName: String? = null,
  )

  private fun parseUser(raw: String?): ParsedUser {
    if (raw.isNullOrBlank()) {
      return ParsedUser()
    }
    return try {
      val json = JSONObject(raw)
      val name = json.optJSONObject("name")
      ParsedUser(
        email = json.optString("email").ifBlank { null },
        givenName = name?.optString("firstName").orEmpty().ifBlank { null },
        familyName = name?.optString("lastName").orEmpty().ifBlank { null },
      )
    } catch (_: Throwable) {
      ParsedUser()
    }
  }

  private fun stringOrNull(json: JSONObject, key: String): String? {
    return if (json.has(key)) json.getString(key).ifBlank { null } else null
  }

  companion object {
    const val NAME = "FormInterceptorInterface"

    /** Script that collects every named form element on the page into one object and passes it as JSON to [NAME]. */
    val JS_TO_INJECT =
      """
      (function () {
        var data = {};
        for (var i = 0; i < document.forms.length; i++) {
          var elements = document.forms[i].elements;
          for (var j = 0; j < elements.length; j++) {
            if (elements[j].name) {
              data[elements[j].name] = elements[j].value;
            }
          }
        }
        window.$NAME.processFormData(JSON.stringify(data));
      })();
      """.trimIndent()
  }
}
