# Web

On web, `expo-apple-sign-in` has no native module. It loads Apple's JavaScript SDK (Apple JS) into the page and opens Apple's sign-in page in a popup, then turns Apple's response into the same credential that iOS and Android return. Web uses the Services ID and Return URL from [Apple Developer](/setup/apple-developer), and adds one rule of its own: the redirect URI must have the same origin as the page that starts sign-in.

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

## Use a same-origin Return URL

Before it loads Apple JS, the library compares the origin of `redirectUri` (scheme, host and port) with `window.location.origin`. When they differ, sign-in rejects with `ERR_NOT_CONFIGURED` and a message that starts like this:

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

## How popup sign-in works

The first call to `AppleAuth.signIn()` on a page adds a `<script>` tag for Apple JS to the document head, or waits for the tag if the page already includes it:

```text
https://appleid.apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js
```

The library then calls `AppleID.auth.init` and `AppleID.auth.signIn` with your `clientId`, the redirect URI, the scopes (`fullName` is sent as `name`), the state, the SHA-256 hash of the nonce and `usePopup: true`. Apple's sign-in page opens in a popup window, and the promise from Apple JS resolves in the page that opened it.

The redirect URI that the library passes to Apple JS depends on the current page. When `redirectUri` has the same origin and path as the current page, the library passes the current page URL without its hash, so Apple's popup returns to a document that loaded the SDK. Otherwise it passes `redirectUri` unchanged. In both cases the URL must be registered as a Return URL on the Services ID.

Apple JS returns the identity token, the authorization code, the state and, on the first authorization only, the user's name and email. It does not return the user identifier, so the library takes `user.id` from the token's `sub` claim. `realUserStatus` is always `'unknown'` on web.

## Errors on web

| Situation | Code |
| --- | --- |
| `clientId` or `redirectUri` is missing, not an absolute URL, or on another origin | `ERR_NOT_CONFIGURED` |
| Apple JS failed to load (`Failed to load the Apple JS SDK.`) | `ERR_NOT_AVAILABLE` |
| Apple JS loaded but `AppleID.auth` is missing (`Apple JS SDK did not initialize.`) | `ERR_NOT_AVAILABLE` |
| The code runs without a browser `document` | `ERR_NOT_AVAILABLE` |
| Apple JS returned no identity token | `ERR_MISSING_IDENTITY_TOKEN` |
| Apple JS rejected with a message about a closed or canceled popup, or a user cancel | `ERR_REQUEST_CANCELED` |

`AppleAuth.isAvailable()` only checks for a browser `document`, so it returns `true` even when a network policy will block Apple JS.

## Content Security Policy

If your site sends a Content Security Policy, allow scripts from Apple's host so the library can load Apple JS:

```text
script-src 'self' https://appleid.apple.com
```

Without that entry, the browser blocks the script and sign-in rejects with `ERR_NOT_AVAILABLE`.

## Test locally through a tunnel

Apple does not accept `localhost` or IP addresses as Services ID domains or Return URLs, so a dev server opened on `localhost` cannot complete sign-in. Expose the dev server through an HTTPS tunnel, register the tunnel host and a Return URL on that host, and open the app through the tunnel URL so that the page origin and `redirectUri` match. A deployed preview on an HTTPS domain works the same way.
