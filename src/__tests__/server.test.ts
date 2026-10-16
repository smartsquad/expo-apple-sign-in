import vm from 'node:vm'

import { EWebRedirectStorage, handleAppleWebRedirect, webRedirectBridgeDocument } from '../server'

const EJsonId = 'expo-apple-sign-in-post'

function jsonOf(document: string): string {
  const match = document.match(
    /<script type="application\/json" id="expo-apple-sign-in-post">(.*?)<\/script>/s
  )
  if (!match) {
    throw new Error('bridge JSON element not found')
  }

  return match[1]
}

function inlineScriptOf(document: string): string {
  const scripts = [...document.matchAll(/<script>(.*?)<\/script>/gs)]
  if (scripts.length !== 1) {
    throw new Error('inline script not found')
  }

  return scripts[0][1]
}

function runBridge(
  formBody: string,
  pending: string | null
): { storage: Record<string, string>; replaced: string[] } {
  const document = webRedirectBridgeDocument(formBody)
  const storage: Record<string, string> = {}
  if (pending !== null) {
    storage[EWebRedirectStorage.pending] = pending
  }
  const replaced: string[] = []
  vm.runInNewContext(inlineScriptOf(document), {
    sessionStorage: {
      getItem: (key: string) => (key in storage ? storage[key] : null),
      setItem: (key: string, value: string) => {
        storage[key] = value
      },
    },
    document: {
      getElementById: (id: string) => (id === EJsonId ? { textContent: jsonOf(document) } : null),
    },
    location: { replace: (target: string) => replaced.push(target) },
  })

  return { storage, replaced }
}

describe('webRedirectBridgeDocument', () => {
  it('keeps only the known non-empty fields', () => {
    const body = new URLSearchParams({
      id_token: 'jwt',
      code: 'c',
      state: 's',
      user: '{"email":"a@b.c"}',
      error: '',
      extra: 'dropped',
    }).toString()

    const document = webRedirectBridgeDocument(body)

    expect(document.startsWith('<!doctype html>')).toBe(true)
    expect(document).toContain('<meta charset="utf-8">')
    expect(document).toContain('<meta name="referrer" content="no-referrer">')
    expect(document).toContain('<title>Signing in</title>')
    expect(JSON.parse(jsonOf(document))).toEqual({
      id_token: 'jwt',
      code: 'c',
      state: 's',
      user: '{"email":"a@b.c"}',
    })
  })

  it('escapes script terminators and line separators', () => {
    const body = new URLSearchParams({
      user: '</script><script>alert(1)</script>  ',
    }).toString()

    const document = webRedirectBridgeDocument(body)
    const json = jsonOf(document)

    expect(document.match(/<\/script>/g)).toHaveLength(2)
    expect(document).not.toContain('alert(1)</script>')
    expect(json).not.toContain('<')
    expect(json).not.toContain(' ')
    expect(json).not.toContain(' ')
    expect(JSON.parse(json).user).toBe('</script><script>alert(1)</script>  ')
  })

  describe('inline script', () => {
    const EBody = new URLSearchParams({ id_token: 'jwt', state: 's' }).toString()

    function pendingWith(returnTo: unknown): string {
      return JSON.stringify({ state: 's', rawNonce: 'n', returnTo })
    }

    it('stores the result and returns to the starting page', () => {
      const { storage, replaced } = runBridge(EBody, pendingWith('/account?x=1#h'))

      expect(JSON.parse(storage[EWebRedirectStorage.result])).toEqual({
        id_token: 'jwt',
        state: 's',
      })
      expect(replaced).toEqual(['/account?x=1#h'])
    })

    it.each(['//evil.example', '/\\evil', 'https://evil.example', '', 5])(
      'falls back to / for returnTo %p',
      (returnTo) => {
        expect(runBridge(EBody, pendingWith(returnTo)).replaced).toEqual(['/'])
      }
    )

    it('falls back to / without a pending record', () => {
      const { storage, replaced } = runBridge(EBody, null)

      expect(storage[EWebRedirectStorage.result]).toBeDefined()
      expect(replaced).toEqual(['/'])
    })

    it('falls back to / for invalid pending JSON', () => {
      expect(runBridge(EBody, '{nope').replaced).toEqual(['/'])
    })
  })
})

describe('handleAppleWebRedirect', () => {
  it('answers a POST with the bridge document and no-store headers', async () => {
    const body = new URLSearchParams({ id_token: 'jwt', state: 's' }).toString()
    const response = await handleAppleWebRedirect(
      new Request('https://app.example.com/auth/apple', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(await response.text()).toBe(webRedirectBridgeDocument(body))
  })

  it('answers other methods with 405 and Allow: POST', async () => {
    const response = await handleAppleWebRedirect(new Request('https://app.example.com/auth/apple'))

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST')
    expect(await response.text()).toBe('')
  })
})
