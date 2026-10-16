# Web

On web, `expo-apple-sign-in` has no native module. It signs in in one of two ways and turns Apple's response into the same credential that iOS and Android return. In popup mode (the default) it loads Apple's JavaScript SDK (Apple JS) into the page and opens Apple's sign-in page in a popup, with no server involved. In redirect mode the tab itself goes to Apple, a server route answers the POST that Apple sends back, and the app picks the result up when it loads again. `webMode: 'auto'` chooses redirect on phones and tablets and popup elsewhere. Both modes use the Services ID and Return URL from [Apple Developer](/setup/apple-developer), and both follow one rule of their own: the redirect URI must have the same origin as the page that starts sign-in.

## Configure the Services ID

Call `AppleAuth.configure` once at startup with the Services ID and a Return URL on the web app's own origin. If the web app runs at `https://app.example.com`, the configuration looks like this:

```ts
import { AppleAuth } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/callback',
})
```

On the Services ID, list `app.example.com` under **Domains and Subdomains** and `https://app.example.com/auth/callback` under **Return URLs**. Without both values in `configure`, sign-in rejects with `ERR_NOT_CONFIGURED` and the message `AppleAuth.configure({ clientId, redirectUri }) is required on web. clientId is the Apple Services ID.`

Without a `webMode`, this configuration uses the popup. [Choose a web mode](#choose-a-web-mode) explains the other two values.

## Use a same-origin Return URL

Both modes run this check first. Before the library loads Apple JS or leaves for Apple, it compares the origin of `redirectUri` (scheme, host and port) with `window.location.origin`. When they differ, sign-in rejects with `ERR_NOT_CONFIGURED` and a message that starts like this:

```text
Web redirectUri origin (https://example.com) must match this page (https://app.example.com).
```

The check catches a common setup mistake: an Expo web app on a subdomain such as `app.example.com` that reuses a Return URL registered for the apex site `example.com`. After a successful login, Apple would send the user to the wrong host. Register a Return URL on the web app's own host and pass that URL on web.

| Page origin | `redirectUri` | Result |
| --- | --- | --- |
| `https://app.example.com` | `https://app.example.com/auth/callback` | Accepted |
| `https://app.example.com` | `https://example.com/auth/callback` | `ERR_NOT_CONFIGURED`, different host |
| `https://app.example.com` | `http://app.example.com/auth/callback` | `ERR_NOT_CONFIGURED`, different scheme |

If `redirectUri` is not an absolute URL at all, sign-in rejects with `ERR_NOT_CONFIGURED` and the message `AppleAuth.configure({ redirectUri }) must be an absolute HTTPS URL. Received:` followed by the value.

If Android uses a Return URL on a different host, register both Return URLs on the same Services ID and pass the right one on each platform. [Expo config](/setup/expo) shows how to do that with environment variables.

## Choose a web mode

`webMode` is an option of `AppleAuth.configure` and of [`useAppleAuth`](/guides/hook#options). It takes one of three values, typed as `AppleWebMode`.

| Value | What happens | What it needs |
| --- | --- | --- |
| `'popup'` (default) | Apple JS opens Apple's sign-in page in a popup, and `AppleAuth.signIn()` resolves in the page that opened it. | A click or press handler that starts sign-in. No server. |
| `'redirect'` | The tab navigates to Apple, Apple POSTs the result to `redirectUri`, and the app reads the result when it loads again. No user gesture is needed. | A server route that accepts a POST at `redirectUri`, and `sessionStorage`. |
| `'auto'` | Redirect when the user agent matches `/Android\|iPhone\|iPad\|iPod/i`, or `/Macintosh/i` with `navigator.maxTouchPoints` above 1 (iPadOS Safari, which reports a Mac user agent). Popup everywhere else. | The same server route as redirect, because phones and tablets use it. Desktop browsers do not. |

In Brave on Android, popup sign-in stopped on Apple's confirm step with `Your request could not be completed because of an error.` Redirect mode completed sign-in in the same browser, and the recording on the [example page](/examples#sign-in) was made that way. Other phone browsers have not been tested.

Pick `'popup'` when the app runs on desktop browsers only or when you cannot deploy a server route. Pick `'auto'` when phones or tablets open the web app and you can answer Apple's POST, because it keeps the popup on desktop and moves touch devices to the redirect. Pick `'redirect'` when you want one code path in every browser.

```ts
import { AppleAuth } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/callback',
  webMode: 'auto',
})
```

## How popup sign-in works

The first call to `AppleAuth.signIn()` on a page adds a `<script>` tag for Apple JS to the document head, or waits for the tag if the page already includes it:

```text
https://appleid.apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js
```

If the script fails to load, the library removes the tag and forgets the failed attempt, so the next call adds a fresh tag and tries again.

The library then calls `AppleID.auth.init` and `AppleID.auth.signIn` with your `clientId`, the redirect URI, the scopes (`fullName` is sent as `name`), the state, the SHA-256 hash of the nonce and `usePopup: true`. Apple's sign-in page opens in a popup window, and the promise from Apple JS resolves in the page that opened it.

Browsers block a popup that no user gesture opened, so call `AppleAuth.signIn()` from a click or press handler, such as the `onPress` of a button. Without an `onPress` prop, `AppleButton` calls `AppleAuth.signIn()` from its own press handler.

The library passes `redirectUri` to Apple JS unchanged. It must match a Return URL registered on the Services ID exactly, character by character.

Apple JS returns the identity token, the authorization code, the state and, on the first authorization only, the user's first name, last name, and email. It does not return the user identifier, so the library takes `user.id` from the token's `sub` claim. `middleName`, `namePrefix`, `nameSuffix`, and `nickname` are always `null` on web, and `realUserStatus` is always `'unknown'`.

## How redirect sign-in works

In redirect mode the page leaves for Apple and comes back through a server. The steps are:

1. `AppleAuth.signIn()` runs the same-origin check on `redirectUri`.
2. It stores `{ state, rawNonce, returnTo }` in `sessionStorage` under `expo-apple-sign-in.web-pending`. `returnTo` is the path, query and hash of the current page.
3. It navigates the tab to `https://appleid.apple.com/auth/authorize` with `client_id`, `redirect_uri`, `response_type=code id_token`, `response_mode=form_post`, `scope` (`fullName` is sent as `name`), `state`, and the SHA-256 hash of the nonce. The page unloads, so the promise from `signIn()` never settles. Without `sessionStorage` it rejects with `ERR_NOT_AVAILABLE` and the message `Web redirect sign-in needs sessionStorage and a browser window.`
4. After the person confirms, Apple POSTs a form to `redirectUri`. The form carries `id_token`, `code`, `state`, `user` (on the first authorization only) or `error`.
5. A server route answers that POST with a small HTML page, as described in [Answer Apple's POST](#answer-apple-s-post). The page stores those fields in `sessionStorage` under `expo-apple-sign-in.web-result` and replaces the location with `returnTo`.
6. The app loads again in the same tab. The library reads the stored result and removes both storage keys, so a result is delivered once.

`sessionStorage` belongs to one tab. The result reaches only the tab that started sign-in, and a POST that lands in another tab ends with an error instead of a credential (see the table in [Errors on web](#errors-on-web)).

After the app loads again, the next call to `AppleAuth.request()` or `AppleAuth.signIn()` returns the stored result without leaving the page. That call skips the configuration check, so it works before `AppleAuth.configure` runs. Three things start that call for you or tell you that it is due:

- `AppleButton` runs its handler again when it mounts, and ignores `disabled` while doing so. With an `onPress` prop it calls `onPress`, so an adapter inside it receives Apple's result. Without one it runs the built-in flow, so `onSuccess`, `onCancel` and `onError` fire. See [Apple button](/guides/button#after-a-web-redirect).
- `useAppleAuth` calls its own `signIn` when it mounts and sets `credential` or `error`. See [useAppleAuth hook](/guides/hook#after-a-web-redirect).
- `AppleAuth.hasWebRedirectResult()` returns `true` while a result waits and nothing has claimed it. Code that renders neither `AppleButton` nor `useAppleAuth` on the return page checks it at startup and calls `AppleAuth.signIn()` or its adapter. See [Usage](/guides/usage#pick-up-a-web-redirect-result).

Only one of them replays a given result: the first one to mount. `AppleAuth.getCurrentCredential()` also returns the credential from a redirect.

## Answer Apple's POST

Apple sends the result of a redirect sign-in as a POST to `redirectUri`, so a route on your server has to answer it. A static file host cannot. `handleAppleWebRedirect` from `expo-apple-sign-in/server` is that route. For any method other than POST it returns `405` with `Allow: POST`, so a GET to the route gets a 405. For a POST it returns an HTML page with `Cache-Control: no-store`, `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff`. The page stores only `id_token`, `code`, `state`, `user` and `error` in `sessionStorage`, then calls `location.replace(returnTo)`. It accepts `returnTo` only when it starts with `/` and the second character is not `/` or `\`. Otherwise it goes to `/`.

In Expo Router, an API route file serves the path of its name. This file serves `/auth/callback`:

```ts [app/auth/callback+api.ts]
import { handleAppleWebRedirect } from 'expo-apple-sign-in/server'

export const POST = handleAppleWebRedirect
```

Expo Router answers other methods with 405 on its own. In SDK 58, API routes need a deployed server, and you turn them on in one of two ways in `app.json`:

```json [app.json]
{
  "expo": {
    "web": { "output": "server" }
  }
}
```

```json [app.json]
{
  "expo": {
    "web": { "output": "static" },
    "plugins": [["expo-router", { "apiRoutes": true }]]
  }
}
```

Use one of the two.

Any server whose handler takes a Fetch `Request` and returns a `Response` can call `handleAppleWebRedirect(request)` directly. Other servers read the raw `application/x-www-form-urlencoded` body as a string and send `webRedirectBridgeDocument(body)` as `text/html` with `Cache-Control: no-store`. The same entry exports `EWebRedirectStorage`, which holds the two key names. The entry has no runtime imports and no React or React Native code, so server code can load it.

::: warning Do not log the request body
The form that Apple posts carries the identity token and the authorization code. `handleAppleWebRedirect` never logs, and neither should a route that wraps it or a request logger in front of it.
:::

## Errors on web

| Situation | Code |
| --- | --- |
| `clientId` or `redirectUri` is missing, not an absolute URL, or on another origin | `ERR_NOT_CONFIGURED` |
| Apple JS failed to load (`Failed to load the Apple JS SDK.`). The next call tries to load it again. | `ERR_NOT_AVAILABLE` |
| Apple JS loaded but `AppleID.auth` is missing (`Apple JS SDK did not initialize.`) | `ERR_NOT_AVAILABLE` |
| The code runs without a browser `document` | `ERR_NOT_AVAILABLE` |
| Redirect mode without `sessionStorage` (`Web redirect sign-in needs sessionStorage and a browser window.`) | `ERR_NOT_AVAILABLE` |
| Apple JS returned no identity token | `ERR_MISSING_IDENTITY_TOKEN` |
| Apple JS rejected with `popup_closed_by_user`, `user_cancelled_authorize`, or another code that contains `cancel` or `closed` | `ERR_REQUEST_CANCELED` |
| Apple JS rejected with `popup_blocked_by_browser` (`The browser blocked the Apple sign-in popup. Call signIn from a click handler.`) | `ERR_REQUEST_FAILED` |
| Apple JS rejected with any other code (`Apple sign-in failed: <code>`) or without one (`Apple sign-in failed.`) | `ERR_REQUEST_UNKNOWN` |
| Redirect: Apple posted an `error` that matches `cancel`, `closed` or `access_denied` | `ERR_REQUEST_CANCELED` from `signIn`, `{ type: 'cancelled' }` from `request` |
| Redirect: Apple posted any other `error` (`Apple sign-in failed: <error>`) | `ERR_REQUEST_UNKNOWN` |
| Redirect: the tab has no pending sign-in, for example another tab or cleared storage (`Apple sign-in returned to a tab with no pending sign-in. Start the sign-in again from this tab.`) | `ERR_REQUEST_FAILED` |
| Redirect: the posted `state` differs from the stored one (`Apple sign-in returned a state that does not match this page.`) | `ERR_REQUEST_FAILED` |
| Redirect: the stored result is unreadable (`Apple sign-in returned a result that this page could not read.`) | `ERR_REQUEST_FAILED` |
| Redirect: the result has no identity token (`Apple did not return an identity token.`) | `ERR_MISSING_IDENTITY_TOKEN` |

Apple JS rejects with a plain object such as `{ error: 'popup_closed_by_user' }`. The library reads its `error` field to pick the code above.

`AppleAuth.isAvailable()` only checks for a browser `document`, so it returns `true` even when a network policy will block Apple JS. `AppleAuth.getCredentialState` always returns `'unknown'` on web, and `AppleAuth.addRevokeListener` never calls its listener and returns a subscription whose `remove()` does nothing.

## Content Security Policy

If your site sends a Content Security Policy and uses the popup, allow scripts from Apple's host so the library can load Apple JS:

```text
script-src 'self' https://appleid.apple.com
```

Without that entry, the browser blocks the script and sign-in rejects with `ERR_NOT_AVAILABLE`.

Redirect mode does not load Apple JS. It needs the browser to load `https://appleid.apple.com` as a top-level navigation of the tab. The page that `handleAppleWebRedirect` returns uses an inline script, and the handler sends no Content Security Policy of its own. If your server adds one to the route response, it must allow inline scripts, or the route must not send one.

## Test locally through a tunnel

Apple does not accept `localhost` or IP addresses as Services ID domains or Return URLs, so a dev server opened on `localhost` cannot complete sign-in. The example app's `npm run web:serve` serves a web export and answers Apple's POST, and a tunnel in front of it tests both modes. [Test locally](/guides/local-testing) walks through the tunnel, the Services ID, and the example on web, Android, and iPhone.
