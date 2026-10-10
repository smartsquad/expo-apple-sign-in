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
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Full-screen activity that loads the Apple authorize page in a WebView, intercepts the `form_post`
 * redirect, and reports the outcome to [AppleSignInCoordinator].
 *
 * Fails with `ERR_NOT_CONFIGURED` when the Services ID or redirect URI extra is missing, and passes on
 * the `ERR_INVALID_RESPONSE` and `ERR_REQUEST_CANCELED` results of [FormInterceptor]. Cancels with
 * `ERR_REQUEST_CANCELED` when the user taps the close button, presses back, or the activity is destroyed
 * before a result arrives.
 */
class AppleSignInActivity : AppCompatActivity() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var finished = false
  private lateinit var redirectUri: Uri
  private lateinit var expectedState: String
  private lateinit var webView: WebView

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

    redirectUri = Uri.parse(redirect)
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

    webView = WebView(this).apply {
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
        if (request?.method == "POST" && isRedirect(request.url)) {
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

    WindowCompat.setDecorFitsSystemWindows(window, false)
    WindowInsetsControllerCompat(window, root).isAppearanceLightStatusBars = true
    ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.statusBars() or WindowInsetsCompat.Type.displayCutout()
      )
      view.setPadding(bars.left, bars.top, bars.right, view.paddingBottom)
      WindowInsetsCompat.CONSUMED
    }

    setContentView(root)
    ViewCompat.requestApplyInsets(root)

    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          finishCanceled()
        }
      }
    )
  }

  override fun onDestroy() {
    if (!finished) {
      finished = true
      AppleSignInCoordinator.cancel()
    }
    if (::webView.isInitialized) {
      (webView.parent as? ViewGroup)?.removeView(webView)
      webView.destroy()
    }
    super.onDestroy()
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

  /**
   * True when [url] has the configured redirect's scheme, host, port, and path.
   * Trailing slashes, the query, and the fragment are ignored.
   */
  private fun isRedirect(url: Uri): Boolean {
    return url.scheme == redirectUri.scheme &&
      url.host == redirectUri.host &&
      url.port == redirectUri.port &&
      (url.path?.trimEnd('/') ?: "") == (redirectUri.path?.trimEnd('/') ?: "")
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
