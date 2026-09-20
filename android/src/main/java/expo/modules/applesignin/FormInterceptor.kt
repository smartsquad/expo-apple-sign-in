package expo.modules.applesignin

import android.webkit.JavascriptInterface
import org.json.JSONObject

internal class FormInterceptor(
  private val expectedState: String,
  private val callback: (Result<AppleCredentialRecord>) -> Unit,
) {
  @JavascriptInterface
  fun processFormData(formData: String) {
    val values = formData.split(FORM_DATA_SEPARATOR)
    val token = valueOf(values, "id_token")
    val code = valueOf(values, "code")
    val state = valueOf(values, "state")
    val userRaw = valueOf(values, "user")

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

  private fun valueOf(values: List<String>, key: String): String? {
    val prefix = "$key$KEY_VALUE_SEPARATOR"
    return values.firstOrNull { it.startsWith(prefix) }?.substringAfter(KEY_VALUE_SEPARATOR)?.ifBlank { null }
  }

  companion object {
    const val NAME = "FormInterceptorInterface"
    private const val FORM_DATA_SEPARATOR = "|"
    private const val KEY_VALUE_SEPARATOR = "="

    val JS_TO_INJECT =
      """
      function parseForm(form){
        var values = '';
        for (var i = 0; i < form.elements.length; i++) {
          values += form.elements[i].name + '$KEY_VALUE_SEPARATOR' + form.elements[i].value + '$FORM_DATA_SEPARATOR';
        }
        $NAME.processFormData(values);
      }
      for (var i = 0; i < document.forms.length; i++) {
        parseForm(document.forms[i]);
      }
      """.trimIndent()
  }
}
