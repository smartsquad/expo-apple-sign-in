// MARK: - Constants

/**
 * sessionStorage keys shared by the browser code and the bridge page. The bridge page writes
 * `result`, and the browser code writes `pending` before it leaves for Apple.
 */
export const EWebRedirectStorage = {
  pending: 'expo-apple-sign-in.web-pending',
  result: 'expo-apple-sign-in.web-result',
} as const

const EPostedFields = ['id_token', 'code', 'state', 'user', 'error'] as const

// MARK: - Bridge document

function escapeJsonForHtml(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * Builds the HTML document a server returns for Apple's `form_post` request to `redirectUri`. It
 * keeps only the fields Apple sends back, stores them in `sessionStorage`, and sends the browser
 * back to the page that started sign-in. The server must not log `formBody`.
 */
export function webRedirectBridgeDocument(formBody: string): string {
  const params = new URLSearchParams(formBody)
  const posted: Record<string, string> = {}
  for (const field of EPostedFields) {
    const value = params.get(field)
    if (value) {
      posted[field] = value
    }
  }
  const json = escapeJsonForHtml(JSON.stringify(posted))
  const resultKey = JSON.stringify(EWebRedirectStorage.result)
  const pendingKey = JSON.stringify(EWebRedirectStorage.pending)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<title>Signing in</title>
</head>
<body>
<script type="application/json" id="expo-apple-sign-in-post">${json}</script>
<script>
(function () {
  try {
    sessionStorage.setItem(${resultKey}, document.getElementById('expo-apple-sign-in-post').textContent);
  } catch (e) {}
  var returnTo = '/';
  try {
    var pending = JSON.parse(sessionStorage.getItem(${pendingKey}));
    if (pending && typeof pending.returnTo === 'string') {
      returnTo = pending.returnTo;
    }
  } catch (e) {}
  if (returnTo.charAt(0) !== '/' || returnTo.charAt(1) === '/' || returnTo.charAt(1) === '\\\\') {
    returnTo = '/';
  }
  location.replace(returnTo);
})();
</script>
</body>
</html>`
}

// MARK: - Request handler

/**
 * Answers Apple's `form_post` request to `redirectUri`. Returns the bridge document for a POST and
 * `405` with `Allow: POST` for any other method. It never logs the request body. In Expo Router,
 * `app/auth/callback+api.ts` contains:
 *
 * ```ts
 * import { handleAppleWebRedirect } from 'expo-apple-sign-in/server'
 *
 * export const POST = handleAppleWebRedirect
 * ```
 */
export async function handleAppleWebRedirect(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  }
  const body = await request.text()

  return new Response(webRedirectBridgeDocument(body), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
