import { AppleAuthError, EAppleAuthErrorCode } from '../errors'
import type { TNativeSignInParams, TNativeSignInResult } from '../types'

const APPLE_JS_SRC =
  'https://appleid.apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'

type TAppleJsResponse = {
  authorization?: {
    code?: string
    id_token?: string
    state?: string
  }
  user?: {
    email?: string
    name?: {
      firstName?: string
      lastName?: string
    }
  }
}

type TAppleJsAuth = {
  init: (config: Record<string, unknown>) => void
  signIn: (config?: Record<string, unknown>) => Promise<TAppleJsResponse>
}

function getAppleAuth(): TAppleJsAuth | null {
  const appleId = (globalThis as { AppleID?: { auth?: TAppleJsAuth } }).AppleID
  return appleId?.auth ?? null
}

let scriptPromise: Promise<void> | null = null

function loadAppleScript(): Promise<void> {
  if (getAppleAuth()) {
    return Promise.resolve()
  }
  if (scriptPromise) {
    return scriptPromise
  }
  if (typeof document === 'undefined') {
    return Promise.reject(
      new AppleAuthError(
        EAppleAuthErrorCode.NotAvailable,
        'Apple JS SDK requires a browser document.'
      )
    )
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${APPLE_JS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => {
        existing.remove()
        scriptPromise = null
        reject(
          new AppleAuthError(EAppleAuthErrorCode.NotAvailable, 'Failed to load the Apple JS SDK.')
        )
      })
      return
    }

    const script = document.createElement('script')
    script.src = APPLE_JS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      scriptPromise = null
      reject(
        new AppleAuthError(EAppleAuthErrorCode.NotAvailable, 'Failed to load the Apple JS SDK.')
      )
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

function parseUser(
  raw: TAppleJsResponse['user']
): Pick<TNativeSignInResult, 'email' | 'givenName' | 'familyName'> {
  return {
    email: raw?.email ?? null,
    givenName: raw?.name?.firstName ?? null,
    familyName: raw?.name?.lastName ?? null,
  }
}

/** Apple JS rejects `signIn` with a plain `{ error: string }` object, not an `Error`. */
function rejectionCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null) {
    const code = (error as { error?: unknown }).error
    if (typeof code === 'string') {
      return code
    }
  }
  if (error instanceof Error) {
    return error.message
  }

  return null
}

/**
 * Apple's JS popup posts the auth response to `redirectURI`, then that page
 * must hand the result back to the opener. The URI therefore has to be on the
 * **same origin** as the Expo web app. Using the apex site while the app runs
 * on a subdomain (for example `example.com` and `app.example.com`) sends the user
 * to the wrong host after a successful login.
 */
export function assertWebRedirectUri(redirectUri: string): void {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return
  }

  let configured: URL
  try {
    configured = new URL(redirectUri)
  } catch {
    throw new AppleAuthError(
      EAppleAuthErrorCode.NotConfigured,
      `AppleAuth.configure({ redirectUri }) must be an absolute HTTPS URL. Received: ${redirectUri}`
    )
  }

  const pageOrigin = window.location.origin
  if (configured.origin !== pageOrigin) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.NotConfigured,
      `Web redirectUri origin (${configured.origin}) must match this page (${pageOrigin}). Register a Return URL on https://${window.location.host} for the Services ID and pass that URL to AppleAuth.configure on web. A redirect on another origin, such as the apex domain when the web app runs on a subdomain, cannot hand the result back to this page.`
    )
  }
}

/**
 * Runs Sign in with Apple through the Apple JS SDK in popup mode, loading the SDK script on first
 * use. Requires `clientId` and a same-origin `redirectUri`. A closed or canceled popup rejects with
 * `ERR_REQUEST_CANCELED`, a blocked popup with `ERR_REQUEST_FAILED`, and any other Apple JS
 * rejection with `ERR_REQUEST_UNKNOWN`.
 */
export async function webSignIn(params: TNativeSignInParams): Promise<TNativeSignInResult> {
  if (!params.clientId) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.NotConfigured,
      'AppleAuth.configure({ clientId, redirectUri }) is required on web. clientId is your Apple Services ID.'
    )
  }
  if (!params.redirectUri) {
    throw new AppleAuthError(
      EAppleAuthErrorCode.NotConfigured,
      'AppleAuth.configure({ redirectUri }) is required on web. Use an HTTPS URL registered to your Services ID.'
    )
  }

  assertWebRedirectUri(params.redirectUri)

  await loadAppleScript()
  const auth = getAppleAuth()
  if (!auth) {
    throw new AppleAuthError(EAppleAuthErrorCode.NotAvailable, 'Apple JS SDK did not initialize.')
  }

  const scope = params.scopes
    .map((value) => (value === 'fullName' ? 'name' : value))
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(' ')

  // Prefer the current page URL (same origin, already validated) so Apple's
  // popup return lands on a document that loaded this SDK. Path must still be
  // registered as a Return URL on the Services ID.
  const redirectURI = resolvePopupRedirectUri(params.redirectUri)

  const config = {
    clientId: params.clientId,
    redirectURI,
    scope,
    state: params.state,
    nonce: params.nonce,
    usePopup: true,
  }

  auth.init(config)

  try {
    const response = await auth.signIn(config)
    const identityToken = response.authorization?.id_token
    if (!identityToken) {
      throw new AppleAuthError(
        EAppleAuthErrorCode.MissingIdentityToken,
        'Apple JS SDK returned no identity token.'
      )
    }

    return {
      identityToken,
      authorizationCode: response.authorization?.code ?? null,
      user: null,
      state: response.authorization?.state ?? params.state,
      ...parseUser(response.user),
      realUserStatus: 'unknown',
    }
  } catch (error) {
    if (error instanceof AppleAuthError) {
      throw error
    }
    const code = rejectionCode(error)
    if (
      code === 'popup_closed_by_user' ||
      code === 'user_cancelled_authorize' ||
      (code !== null && /cancel|closed/i.test(code))
    ) {
      throw new AppleAuthError(
        EAppleAuthErrorCode.Canceled,
        'The user canceled Apple sign-in.',
        error
      )
    }
    if (code === 'popup_blocked_by_browser') {
      throw new AppleAuthError(
        EAppleAuthErrorCode.Failed,
        'The browser blocked the Apple sign-in popup. Call signIn from a click handler.',
        error
      )
    }
    throw new AppleAuthError(
      EAppleAuthErrorCode.Unknown,
      code ? `Apple sign-in failed: ${code}` : 'Apple sign-in failed.',
      error
    )
  }
}

/**
 * For popup mode Apple loads `redirectURI` inside the popup after auth. Prefer
 * the configured URI when it already points at this exact page; otherwise keep
 * the configured same-origin URI (caller registered it). Never rewrite to a
 * different origin.
 */
function resolvePopupRedirectUri(configured: string): string {
  if (typeof window === 'undefined' || !window.location?.href) {
    return configured
  }

  try {
    const configuredUrl = new URL(configured)
    const pageUrl = new URL(window.location.href)
    pageUrl.hash = ''
    if (configuredUrl.origin === pageUrl.origin && configuredUrl.pathname === pageUrl.pathname) {
      return pageUrl.toString()
    }
  } catch {
    return configured
  }

  return configured
}

/** True when a browser `document` exists. The Apple JS SDK itself loads on the first sign-in. */
export function isWebAppleAvailable(): boolean {
  return typeof document !== 'undefined'
}
