import { EAppleAuthErrorCode } from '../errors'
type TAppleJsAuth = {
  init: jest.Mock
  signIn: jest.Mock
}

type TScriptStub = {
  src: string
  async: boolean
  onload: (() => void) | null
  onerror: (() => void) | null
  addEventListener: (name: string, fn: () => void) => void
  remove: () => void
}

type TDocumentStub = {
  querySelector: jest.Mock
  createElement: jest.Mock
  head: { appendChild: jest.Mock }
}

type TBrowserStub = {
  document: TDocumentStub
  attached: () => TScriptStub | null
}

type TAppleJsModule = typeof import('../web/appleJs')

type TWebParams = Parameters<TAppleJsModule['webSignIn']>[0]

const EParams: TWebParams = {
  nonce: 'hashed-nonce',
  rawNonce: 'raw-nonce',
  mode: 'popup',
  state: 'state-1',
  scopes: ['name', 'email', 'fullName'],
  clientId: 'com.example.app.service',
  redirectUri: 'https://app.example.com/callback',
}

function createScriptStub(): TScriptStub {
  const script: TScriptStub = {
    src: '',
    async: false,
    onload: null,
    onerror: null,
    addEventListener: (name, fn) => {
      if (name === 'load') {
        script.onload = fn
      }
      if (name === 'error') {
        script.onerror = fn
      }
    },
    remove: () => {},
  }

  return script
}

/**
 * Appending a script loads it only when `auth` is given, so tests without `auth` can fire the
 * script's load and error events themselves.
 */
function installBrowser(
  auth: TAppleJsAuth | null = null,
  pageHref = 'https://app.example.com/callback'
): TBrowserStub {
  const pageUrl = new URL(pageHref)
  let attached: TScriptStub | null = null
  const documentStub: TDocumentStub = {
    querySelector: jest.fn(() => attached),
    createElement: jest.fn(() => createScriptStub()),
    head: {
      appendChild: jest.fn((script: TScriptStub) => {
        attached = script
        script.remove = () => {
          attached = null
        }
        if (auth) {
          ;(globalThis as { AppleID?: { auth: TAppleJsAuth } }).AppleID = { auth }
          script.onload?.()
        }
      }),
    },
  }

  ;(globalThis as { document?: typeof documentStub }).document = documentStub
  ;(globalThis as { window?: unknown }).window = {
    location: {
      href: pageHref,
      origin: pageUrl.origin,
      host: pageUrl.host,
      pathname: pageUrl.pathname,
      search: pageUrl.search,
      hash: pageUrl.hash,
      assign: jest.fn(),
    },
  }

  return { document: documentStub, attached: () => attached }
}

function loadAppleJs(): TAppleJsModule {
  jest.resetModules()

  return require('../web/appleJs') as TAppleJsModule
}

function rejectingAuth(rejection: unknown): TAppleJsAuth {
  return { init: jest.fn(), signIn: jest.fn().mockRejectedValue(rejection) }
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected the promise to reject')
}

type TStorageStub = Record<string, string>

function installSessionStorage(initial: TStorageStub = {}): TStorageStub {
  const data: TStorageStub = { ...initial }
  ;(globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value
    },
    removeItem: (key: string) => {
      delete data[key]
    },
  }

  return data
}

function assignMock(): jest.Mock {
  return (globalThis as { window: { location: { assign: jest.Mock } } }).window.location.assign
}

function setNavigator(userAgent: string, maxTouchPoints = 0): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent, maxTouchPoints },
    configurable: true,
  })
}

const EAndroidUa = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile'
const EIphoneUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15'
const EIpadUa = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15'
const EMacUa =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'
const EWindowsUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126'

afterEach(() => {
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage
  delete (globalThis as { navigator?: unknown }).navigator
  delete (globalThis as { document?: unknown }).document
  delete (globalThis as { window?: unknown }).window
  delete (globalThis as { AppleID?: unknown }).AppleID
})

describe('isWebAppleAvailable', () => {
  it('is false without a document', () => {
    const { isWebAppleAvailable } = loadAppleJs()
    expect(isWebAppleAvailable()).toBe(false)
  })

  it('is true in a browser document', () => {
    installBrowser()
    const { isWebAppleAvailable } = loadAppleJs()
    expect(isWebAppleAvailable()).toBe(true)
  })
})

describe('webSignIn', () => {
  it('requires clientId and redirectUri', async () => {
    const { webSignIn } = loadAppleJs()
    try {
      await webSignIn({ ...EParams, clientId: undefined })
      throw new Error('expected clientId to be required')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.NotConfigured })
    }
    try {
      await webSignIn({ ...EParams, redirectUri: undefined })
      throw new Error('expected redirectUri to be required')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.NotConfigured })
    }
  })

  it('rejects a redirectUri on a different origin than the Expo web page', async () => {
    installBrowser(null, 'https://app.example.com/')
    const { webSignIn } = loadAppleJs()
    try {
      await webSignIn({
        ...EParams,
        redirectUri: 'https://example.com/auth/callback',
      })
      throw new Error('expected cross-origin redirectUri to fail')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.NotConfigured })
      expect(String((error as Error).message)).toMatch(/\(https:\/\/example\.com\)/)
      expect(String((error as Error).message)).toMatch(/\(https:\/\/app\.example\.com\)/)
    }
  })

  it('maps fullName to name, inits Apple JS, and returns the credential', async () => {
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockResolvedValue({
        authorization: { id_token: 'jwt', code: 'auth-code', state: 'echo' },
        user: { email: 'ada@example.com', name: { firstName: 'Ada', lastName: 'Lovelace' } },
      }),
    }
    installBrowser(auth, 'https://app.example.com/callback')
    const { webSignIn } = loadAppleJs()
    const result = await webSignIn(EParams)

    expect(auth.init).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: EParams.clientId,
        redirectURI: 'https://app.example.com/callback',
        scope: 'name email',
        nonce: 'hashed-nonce',
        usePopup: true,
      })
    )
    expect(result).toEqual({
      identityToken: 'jwt',
      authorizationCode: 'auth-code',
      user: null,
      state: 'echo',
      email: 'ada@example.com',
      givenName: 'Ada',
      familyName: 'Lovelace',
      realUserStatus: 'unknown',
    })
  })

  it('passes the configured redirectUri to Apple JS unchanged when the page has a query string', async () => {
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockResolvedValue({ authorization: { id_token: 'jwt' } }),
    }
    installBrowser(auth, 'https://app.example.com/callback?next=%2Faccount')
    const { webSignIn } = loadAppleJs()

    await webSignIn(EParams)

    expect(auth.init).toHaveBeenCalledWith(
      expect.objectContaining({ redirectURI: 'https://app.example.com/callback' })
    )
    expect(auth.signIn).toHaveBeenCalledWith(
      expect.objectContaining({ redirectURI: 'https://app.example.com/callback' })
    )
  })

  it('keeps using Apple JS in popup mode on an Android user agent', async () => {
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockResolvedValue({ authorization: { id_token: 'jwt' } }),
    }
    installBrowser(auth)
    installSessionStorage()
    setNavigator(EAndroidUa, 5)
    const { webSignIn } = loadAppleJs()

    await webSignIn({ ...EParams, mode: 'popup' })

    expect(auth.signIn).toHaveBeenCalledTimes(1)
    expect(assignMock()).not.toHaveBeenCalled()
  })

  it('maps a closed popup to ERR_REQUEST_CANCELED', async () => {
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockRejectedValue(new Error('popup closed by user')),
    }
    installBrowser(auth)
    const { webSignIn } = loadAppleJs()
    try {
      await webSignIn(EParams)
      throw new Error('expected popup close to cancel')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.Canceled })
    }
  })

  it.each(['popup_closed_by_user', 'user_cancelled_authorize'])(
    'maps the Apple JS %s rejection to ERR_REQUEST_CANCELED',
    async (code) => {
      installBrowser(rejectingAuth({ error: code }))
      const { webSignIn } = loadAppleJs()

      const error = await rejectionOf(webSignIn(EParams))

      expect(error).toMatchObject({ name: 'AppleAuthError', code: EAppleAuthErrorCode.Canceled })
    }
  )

  it('maps a blocked popup to ERR_REQUEST_FAILED', async () => {
    installBrowser(rejectingAuth({ error: 'popup_blocked_by_browser' }))
    const { webSignIn } = loadAppleJs()

    const error = await rejectionOf(webSignIn(EParams))

    expect(error).toMatchObject({ name: 'AppleAuthError', code: EAppleAuthErrorCode.Failed })
    expect((error as Error).message).toMatch(/popup/)
  })

  it('maps other Apple JS rejections to ERR_REQUEST_UNKNOWN with the Apple code', async () => {
    const rejection = { error: 'invalid_request' }
    installBrowser(rejectingAuth(rejection))
    const { webSignIn } = loadAppleJs()

    const error = await rejectionOf(webSignIn(EParams))

    expect(error).toMatchObject({ name: 'AppleAuthError', code: EAppleAuthErrorCode.Unknown })
    expect((error as Error).message).toContain('invalid_request')
    expect((error as Error).message).not.toContain('[object Object]')
    expect((error as { cause?: unknown }).cause).toBe(rejection)
  })

  it('maps a thrown Error to ERR_REQUEST_UNKNOWN with its message', async () => {
    const boom = new Error('boom')
    installBrowser(rejectingAuth(boom))
    const { webSignIn } = loadAppleJs()

    const error = await rejectionOf(webSignIn(EParams))

    expect(error).toMatchObject({ name: 'AppleAuthError', code: EAppleAuthErrorCode.Unknown })
    expect((error as Error).message).toContain('boom')
    expect((error as { cause?: unknown }).cause).toBe(boom)
  })

  it('loads the Apple JS SDK again after a script error', async () => {
    const browser = installBrowser()
    const { webSignIn } = loadAppleJs()

    const first = webSignIn(EParams)
    const firstScript = browser.attached()
    expect(firstScript).not.toBeNull()
    firstScript?.onerror?.()

    await expect(first).rejects.toMatchObject({
      name: 'AppleAuthError',
      code: EAppleAuthErrorCode.NotAvailable,
    })
    expect(browser.document.createElement).toHaveBeenCalledTimes(1)
    expect(browser.attached()).toBeNull()

    const second = webSignIn(EParams)
    expect(browser.document.createElement).toHaveBeenCalledTimes(2)
    const secondScript = browser.attached()
    expect(secondScript).not.toBeNull()
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockResolvedValue({ authorization: { id_token: 'jwt' } }),
    }
    ;(globalThis as { AppleID?: { auth: TAppleJsAuth } }).AppleID = { auth }
    secondScript?.onload?.()

    await expect(second).resolves.toMatchObject({ identityToken: 'jwt' })
  })

  it('detaches an existing Apple JS script that fails to load and rejects', async () => {
    const browser = installBrowser()
    const existing = createScriptStub()
    browser.document.head.appendChild(existing)
    const { webSignIn } = loadAppleJs()

    const pending = webSignIn(EParams)
    existing.onerror?.()

    await expect(pending).rejects.toMatchObject({
      name: 'AppleAuthError',
      code: EAppleAuthErrorCode.NotAvailable,
    })
    expect(browser.attached()).toBeNull()
    expect(browser.document.createElement).not.toHaveBeenCalled()
  })

  it('throws when Apple JS returns no identity token', async () => {
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockResolvedValue({ authorization: { code: 'only-code' } }),
    }
    installBrowser(auth)
    const { webSignIn } = loadAppleJs()
    try {
      await webSignIn(EParams)
      throw new Error('expected missing token to throw')
    } catch (error) {
      expect(error).toMatchObject({ code: EAppleAuthErrorCode.MissingIdentityToken })
    }
  })
})

describe('prefersWebRedirect', () => {
  it.each([
    ['Android', EAndroidUa, 5, true],
    ['iPhone', EIphoneUa, 5, true],
    ['iPad', EIpadUa, 5, true],
    ['Mac user agent with touch points', EMacUa, 5, true],
    ['Mac user agent without touch points', EMacUa, 0, false],
    ['Windows', EWindowsUa, 0, false],
  ])('%s', (_label, userAgent, maxTouchPoints, expected) => {
    const { prefersWebRedirect } = loadAppleJs()
    expect(prefersWebRedirect(userAgent, maxTouchPoints)).toBe(expected)
  })

  it('reads navigator by default', () => {
    const { prefersWebRedirect } = loadAppleJs()
    expect(prefersWebRedirect()).toBe(false)
    setNavigator(EAndroidUa)
    expect(prefersWebRedirect()).toBe(true)
  })
})

describe('webSignIn redirect mode', () => {
  function expectAppleRedirect(storage: TStorageStub, returnTo: string): void {
    const assign = assignMock()
    expect(assign).toHaveBeenCalledTimes(1)
    const url = new URL(assign.mock.calls[0][0] as string)
    expect(`${url.origin}${url.pathname}`).toBe('https://appleid.apple.com/auth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'com.example.app.service',
      redirect_uri: 'https://app.example.com/callback',
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email',
      state: 'state-1',
      nonce: 'hashed-nonce',
    })
    expect(JSON.parse(storage['expo-apple-sign-in.web-pending'])).toEqual({
      state: 'state-1',
      rawNonce: 'raw-nonce',
      returnTo,
    })
  }

  it('leaves for Apple in auto mode on an Android user agent', async () => {
    installBrowser(null, 'https://app.example.com/account?x=1#h')
    const storage = installSessionStorage()
    setNavigator(EAndroidUa, 5)
    const { webSignIn } = loadAppleJs()

    const settled = jest.fn()
    webSignIn({ ...EParams, mode: 'auto' }).then(settled, settled)
    await new Promise((resolve) => setImmediate(resolve))

    expectAppleRedirect(storage, '/account?x=1#h')
    expect(settled).not.toHaveBeenCalled()
  })

  it('leaves for Apple in redirect mode on a desktop user agent', async () => {
    installBrowser(null, 'https://app.example.com/')
    const storage = installSessionStorage()
    setNavigator(EWindowsUa)
    const { webSignIn } = loadAppleJs()

    const settled = jest.fn()
    webSignIn({ ...EParams, mode: 'redirect' }).then(settled, settled)
    await new Promise((resolve) => setImmediate(resolve))

    expectAppleRedirect(storage, '/')
    expect(settled).not.toHaveBeenCalled()
  })

  it('uses the popup in auto mode on a desktop user agent', async () => {
    const auth: TAppleJsAuth = {
      init: jest.fn(),
      signIn: jest.fn().mockResolvedValue({ authorization: { id_token: 'jwt' } }),
    }
    installBrowser(auth)
    installSessionStorage()
    setNavigator(EWindowsUa)
    const { webSignIn } = loadAppleJs()

    await webSignIn({ ...EParams, mode: 'auto' })

    expect(auth.signIn).toHaveBeenCalledTimes(1)
    expect(assignMock()).not.toHaveBeenCalled()
  })

  it('omits scope when no scopes are requested', async () => {
    installBrowser(null)
    installSessionStorage()
    const { webSignIn } = loadAppleJs()

    webSignIn({ ...EParams, mode: 'redirect', scopes: [] }).catch(() => {})
    await new Promise((resolve) => setImmediate(resolve))

    const url = new URL(assignMock().mock.calls[0][0] as string)
    expect(url.searchParams.has('scope')).toBe(false)
  })

  it('throws NotAvailable without sessionStorage', async () => {
    installBrowser(null)
    const { webSignIn } = loadAppleJs()

    await expect(webSignIn({ ...EParams, mode: 'redirect' })).rejects.toMatchObject({
      code: EAppleAuthErrorCode.NotAvailable,
      message: 'Web redirect sign-in needs sessionStorage and a browser window.',
    })
  })
})

describe('consumeWebRedirectResult', () => {
  const EPendingKey = 'expo-apple-sign-in.web-pending'
  const EResultKey = 'expo-apple-sign-in.web-result'
  const EPending = JSON.stringify({ state: 'state-1', rawNonce: 'raw-nonce', returnTo: '/' })
  const EIdToken =
    'header.' + Buffer.from(JSON.stringify({ sub: 'user-9' })).toString('base64url') + '.sig'

  function consume(posted: unknown, pending: string | null = EPending) {
    const storage = installSessionStorage({
      [EResultKey]: typeof posted === 'string' ? posted : JSON.stringify(posted),
      ...(pending === null ? {} : { [EPendingKey]: pending }),
    })
    const { consumeWebRedirectResult } = loadAppleJs()
    const response = consumeWebRedirectResult()
    expect(storage).toEqual({})

    return response
  }

  it('returns null when sessionStorage is undefined', () => {
    const { consumeWebRedirectResult } = loadAppleJs()
    expect(consumeWebRedirectResult()).toBeNull()
  })

  it('returns null when no result is stored and keeps pending', () => {
    const storage = installSessionStorage({ [EPendingKey]: EPending })
    const { consumeWebRedirectResult } = loadAppleJs()

    expect(consumeWebRedirectResult()).toBeNull()
    expect(storage[EPendingKey]).toBe(EPending)
  })

  it('returns the credential with the raw nonce and the posted user names', () => {
    const response = consume({
      id_token: EIdToken,
      code: 'auth-code',
      state: 'state-1',
      user: JSON.stringify({
        email: 'ada@example.com',
        name: { firstName: 'Ada', lastName: 'Lovelace' },
      }),
    })

    expect(response).toEqual({
      type: 'success',
      data: {
        identityToken: EIdToken,
        authorizationCode: 'auth-code',
        nonce: 'raw-nonce',
        state: 'state-1',
        user: {
          id: 'user-9',
          email: 'ada@example.com',
          givenName: 'Ada',
          familyName: 'Lovelace',
          middleName: null,
          namePrefix: null,
          nameSuffix: null,
          nickname: null,
        },
        realUserStatus: 'unknown',
      },
    })
  })

  it('ignores an unparsable posted user', () => {
    const response = consume({ id_token: EIdToken, state: 'state-1', user: '{nope' })

    expect(response).toMatchObject({
      type: 'success',
      data: { authorizationCode: null, user: { givenName: null } },
    })
  })

  it.each(['user_cancelled_authorize', 'popup_closed_by_user', 'access_denied'])(
    'maps the posted %s error to cancelled',
    (error) => {
      expect(consume({ error, state: 'state-1' })).toEqual({ type: 'cancelled' })
    }
  )

  it('maps another posted error to ERR_REQUEST_UNKNOWN', () => {
    expect(consume({ error: 'invalid_request', state: 'state-1' })).toEqual({
      type: 'error',
      code: EAppleAuthErrorCode.Unknown,
      message: 'Apple sign-in failed: invalid_request',
    })
  })

  it('rejects a state mismatch', () => {
    expect(consume({ id_token: EIdToken, state: 'other' })).toEqual({
      type: 'error',
      code: EAppleAuthErrorCode.Failed,
      message: 'Apple sign-in returned a state that does not match this page.',
    })
  })

  it.each([null, 'not json', JSON.stringify({ state: 'state-1' })])(
    'rejects a missing or invalid pending record (%s)',
    (pending) => {
      expect(consume({ id_token: EIdToken, state: 'state-1' }, pending)).toEqual({
        type: 'error',
        code: EAppleAuthErrorCode.Failed,
        message:
          'Apple sign-in returned to a tab with no pending sign-in. Start the sign-in again from this tab.',
      })
    }
  )

  it.each(['not json', '[1]', 'null'])('rejects an unreadable result (%s)', (posted) => {
    expect(consume(posted)).toEqual({
      type: 'error',
      code: EAppleAuthErrorCode.Failed,
      message: 'Apple sign-in returned a result that this page could not read.',
    })
  })

  it('reports a missing identity token', () => {
    expect(consume({ code: 'auth-code', state: 'state-1' })).toEqual({
      type: 'error',
      code: EAppleAuthErrorCode.MissingIdentityToken,
      message: 'Apple did not return an identity token.',
    })
  })
})
