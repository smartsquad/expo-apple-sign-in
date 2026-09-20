package expo.modules.applesignin

import android.annotation.SuppressLint
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageButton
import androidx.appcompat.app.AppCompatActivity

class AppleSignInActivity : AppCompatActivity() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var finished = false
  private lateinit var redirectUri: String
  private lateinit var expectedState: String

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val clientId = intent.getStringExtra(AppleSignInCoordinator.EXTRA_CLIENT_ID)
    val redirect = intent.getStringExtra(AppleSignInCoordinator.EXTRA_REDIRECT_URI)
    val nonce = intent.getStringExtra(AppleSignInCoordinator.EXTRA_NONCE)
    val state = intent.getStringExtra(AppleSignInCoordinator.EXTRA_STATE) ?: "state"
    val scopes = intent.getStringExtra(AppleSignInCoordinator.EXTRA_SCOPES) ?: "name email"

    if (clientId.isNullOrBlank() || redirect.isNullOrBlank()) {
      finishWithError(AppleAuthNativeError("ERR_NOT_CONFIGURED", "Missing Apple Services ID or redirect URI."))
      return
    }

    redirectUri = redirect
    expectedState = state

    val authorize = Uri.parse("https://appleid.apple.com/auth/authorize").buildUpon().apply {
      appendQueryParameter("client_id", clientId)
      appendQueryParameter("redirect_uri", redirect)
      appendQueryParameter("response_type", "code id_token")
      appendQueryParameter("response_mode", "form_post")
      appendQueryParameter("scope", scopes)
      appendQueryParameter("state", state)
      if (!nonce.isNullOrBlank()) {
        appendQueryParameter("nonce", nonce)
      }
    }.build()

    val webView = WebView(this).apply {
      settings.javaScriptEnabled = true
      settings.javaScriptCanOpenWindowsAutomatically = true
      settings.domStorageEnabled = true
      setBackgroundColor(Color.WHITE)
    }

    val interceptor = FormInterceptor(expectedState) { result ->
      mainHandler.post {
        result.fold(
          onSuccess = { finishWithSuccess(it) },
          onFailure = { finishWithError(it) },
        )
      }
    }
    webView.addJavascriptInterface(interceptor, FormInterceptor.NAME)
    webView.webViewClient = object : WebViewClient() {
      override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
        if (request?.method == "POST" && request.url.toString().contains(redirectUri)) {
          mainHandler.post {
            view?.stopLoading()
            view?.evaluateJavascript(FormInterceptor.JS_TO_INJECT, null)
          }
        }
        return super.shouldInterceptRequest(view, request)
      }
    }
    webView.loadUrl(authorize.toString())

    val root = FrameLayout(this).apply {
      setBackgroundColor(Color.WHITE)
      addView(webView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    }

    val close = ImageButton(this).apply {
      setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
      setBackgroundColor(Color.TRANSPARENT)
      setColorFilter(Color.DKGRAY)
      contentDescription = "Close"
      setOnClickListener { finishCanceled() }
    }
    root.addView(
      close,
      FrameLayout.LayoutParams(dp(48), dp(48)).apply {
        gravity = Gravity.END or Gravity.TOP
        topMargin = dp(8)
        marginEnd = dp(8)
      }
    )

    setContentView(root)
  }

  override fun onBackPressed() {
    finishCanceled()
  }

  private fun finishWithSuccess(record: AppleCredentialRecord) {
    if (finished) return
    finished = true
    AppleSignInCoordinator.complete(record)
    finish()
  }

  private fun finishWithError(error: Throwable) {
    if (finished) return
    finished = true
    AppleSignInCoordinator.fail(error)
    finish()
  }

  private fun finishCanceled() {
    if (finished) return
    finished = true
    AppleSignInCoordinator.cancel()
    finish()
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
