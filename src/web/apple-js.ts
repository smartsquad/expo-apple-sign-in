import { enrichUserFromToken, toAppleCredential } from '../credential'
import { AppleAuthError, EAppleAuthErrorCode } from '../errors'
import { EWebRedirectStorage } from '../server'
import type {
  TAppleAuthResponse,
  TAppleWebMode,
  TNativeSignInParams,
  TNativeSignInResult,
} from '../types'

// MARK: - Constants

const APPLE_JS_SRC =
  'https://appleid.apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'

const APPLE_AUTHORIZE_URL = 'https://appleid.apple.com/auth/authorize'

// MARK: - Types

type TWebSignInParams = TNativeSignInParams & { rawNonce: string; mode: TAppleWebMode }

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

function appleScope(scopes: string[]): string {
  return scopes
    .map((value) => (value === 'fullName' ? 'name' : value))
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(' ')
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
 * True for Android, iPhone, iPad, and iPod browsers, and for iPadOS Safari, which reports a Mac user
 * agent with more than one touch point. Defaults to the current `navigator`.
 */
export function prefersWebRedirect(
  userAgent: string | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.userAgent,
  maxTouchPoints: number | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.maxTouchPoints
): boolean {
  if (!userAgent) {
    return false
  }
  if (/Android|iPhone|iPad|iPod/i.test(userAgent)) {
    return true
  }

  return /Macintosh/i.test(userAgent) && (maxTouchPoints ?? 0) > 1
}

/**
 * Runs Sign in with Apple on web. In popup mode it uses the Apple JS SDK, loading the script on
 * first use. A closed or canceled popup rejects with `ERR_REQUEST_CANCELED`, a blocked popup with
 * `ERR_REQUEST_FAILED`, and any other Apple JS rejection with `ERR_REQUEST_UNKNOWN`. In redirect
 * mode the page leaves for Apple and the returned promise never settles; read the result with
 * {@link consumeWebRedirectResult} after Apple's POST brings the browser back. Requires `clientId`
 * and a same-origin `redirectUri`.
 */
export async function webSignIn(params: TWebSignInParams): Promise<TNativeSignInResult> {
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

  if (params.mode === 'redirect' || (params.mode === 'auto' && prefersWebRedirect())) {
    return startWebRedirect({
      ...params,
      clientId: params.clientId,
      redirectUri: params.redirectUri,
    })
  }

  await loadAppleScript()
  const auth = getAppleAuth()
  if (!auth) {
    throw new AppleAuthError(EAppleAuthErrorCode.NotAvailable, 'Apple JS SDK did not initialize.')
  }

  const config = {
    clientId: params.clientId,
    redirectURI: params.redirectUri,
    scope: appleScope(params.scopes),
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

// MARK: - Redirect mode

function startWebRedirect(
  params: TWebSignInParams & { clientId: string; redirectUri: string }
): Promise<never> {
  if (typeof sessionStorage === 'undefined' || typeof window === 'undefined') {
    throw new AppleAuthError(
      EAppleAuthErrorCode.NotAvailable,
      'Web redirect sign-in needs sessionStorage and a browser window.'
    )
  }

  const { pathname, search, hash } = window.location
  sessionStorage.setItem(
    EWebRedirectStorage.pending,
    JSON.stringify({
      state: params.state,
      rawNonce: params.rawNonce,
      returnTo: pathname + search + hash,
    })
  )

  const url = new URL(APPLE_AUTHORIZE_URL)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code id_token')
  url.searchParams.set('response_mode', 'form_post')
  const scope = appleScope(params.scopes)
  if (scope) {
    url.searchParams.set('scope', scope)
  }
  url.searchParams.set('state', params.state)
  url.searchParams.set('nonce', params.nonce)
  window.location.assign(url.toString())

  return new Promise<never>(() => {})
}

type TPostedResult = {
  id_token?: unknown
  code?: unknown
  state?: unknown
  user?: unknown
  error?: unknown
}

function readJsonObject(raw: string | null): Record<string, unknown> | null {
  if (raw === null) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return null
  }

  return null
}

function failedResponse(
  message: string,
  code: string = EAppleAuthErrorCode.Failed
): TAppleAuthResponse {
  return { type: 'error', code, message }
}

function parsePostedUser(
  raw: unknown
): Pick<TNativeSignInResult, 'email' | 'givenName' | 'familyName'> {
  const empty = { email: null, givenName: null, familyName: null }
  if (typeof raw !== 'string') {
    return empty
  }
  try {
    const user = JSON.parse(raw) as TAppleJsResponse['user']

    return parseUser(user)
  } catch {
    return empty
  }
}

/**
 * Reads and clears the result stored by the bridge page after Apple's `form_post` redirect. Returns
 * null when there is no stored result. Both storage keys are removed before the result is checked,
 * so a result is delivered at most once.
 */
export function consumeWebRedirectResult(): TAppleAuthResponse | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  const rawResult = sessionStorage.getItem(EWebRedirectStorage.result)
  if (rawResult === null) {
    return null
  }
  const rawPending = sessionStorage.getItem(EWebRedirectStorage.pending)
  sessionStorage.removeItem(EWebRedirectStorage.result)
  sessionStorage.removeItem(EWebRedirectStorage.pending)

  const posted = readJsonObject(rawResult) as TPostedResult | null
  if (!posted) {
    return failedResponse('Apple sign-in returned a result that this page could not read.')
  }

  const pending = readJsonObject(rawPending)
  if (!pending || typeof pending.state !== 'string' || typeof pending.rawNonce !== 'string') {
    return failedResponse(
      'Apple sign-in returned to a tab with no pending sign-in. Start the sign-in again from this tab.'
    )
  }
  if (posted.state !== pending.state) {
    return failedResponse('Apple sign-in returned a state that does not match this page.')
  }

  if (typeof posted.error === 'string' && posted.error) {
    if (/cancel|closed|access_denied/i.test(posted.error)) {
      return { type: 'cancelled' }
    }

    return failedResponse(`Apple sign-in failed: ${posted.error}`, EAppleAuthErrorCode.Unknown)
  }

  if (typeof posted.id_token !== 'string' || !posted.id_token) {
    return failedResponse(
      'Apple did not return an identity token.',
      EAppleAuthErrorCode.MissingIdentityToken
    )
  }

  const credential = toAppleCredential(
    {
      identityToken: posted.id_token,
      authorizationCode: typeof posted.code === 'string' ? posted.code : null,
      state: posted.state,
      ...parsePostedUser(posted.user),
      realUserStatus: 'unknown',
    },
    pending.rawNonce
  )

  return { type: 'success', data: enrichUserFromToken(credential) }
}

// MARK: - Availability

/** True when a browser `document` exists. The Apple JS SDK itself loads on the first sign-in. */
export function isWebAppleAvailable(): boolean {
  return typeof document !== 'undefined'
}
