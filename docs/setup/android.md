# Android

On Android, `expo-apple-sign-in` runs Apple's web sign-in flow inside your app. A Kotlin activity opens Apple's authorize page in a WebView, the user signs in there, and the library reads the identity token from the form that Apple posts back. Because this is Apple's web flow, Android identifies your app by a Services ID and needs an HTTPS redirect URI registered on it.

## Configure the Services ID

Pass the Services ID as `clientId` and the Return URL as `redirectUri`. Call `AppleAuth.configure` once at startup, before the first sign-in:

```ts
import { AppleAuth } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/callback',
})
```

Without both values, `AppleAuth.signIn()` rejects with `ERR_NOT_CONFIGURED` and the message `AppleAuth.configure({ clientId, redirectUri }) is required on android. clientId is the Apple Services ID.` [Apple Developer](/setup/apple-developer) shows how to create the Services ID.

## Register the redirect URI

Apple only redirects to Return URLs registered on the Services ID, so the exact string you pass as `redirectUri` must be listed under **Return URLs**, and its host must be listed under **Domains and Subdomains**. The URL must use HTTPS, and Apple rejects `localhost` and IP addresses. A Services ID can list several Return URLs, so Android may use a different one from web. [Test locally](/guides/local-testing#test-on-an-android-device) shows how to try a Return URL on a device through a tunnel.

## How the sign-in screen works

`AppleAuth.signIn()` on Android goes through these steps:

1. The library generates a nonce if you did not pass one, hashes it with SHA-256, and passes the hash, a state value, the scopes, `clientId` and `redirectUri` to the native module.
2. The module starts its own activity, which shows a full-screen WebView below the status bar with a close button in the top corner. The activity handles changes to orientation, screen size, hardware keyboard availability, screen layout, and UI mode (such as a switch to dark mode) itself through `configChanges`, so Apple's page survives a rotation, and it uses `adjustResize`, so the page resizes when the keyboard opens.
3. The WebView loads `https://appleid.apple.com/auth/authorize` with your `client_id` and `redirect_uri`, `response_type=code id_token`, `response_mode=form_post`, the scopes (`fullName` is sent as `name`), the state and the hashed nonce.
4. The user signs in on Apple's page. Apple then submits a form with a `POST` request to your `redirect_uri`, carrying `id_token`, `code`, `state` and, on the first authorization only, a `user` field with the name and email.
5. When the WebView sees a `POST` request whose scheme, host, port, and path equal those of your `redirectUri`, the activity stops loading the page. A trailing slash on the path does not matter, and neither do the query and the fragment. A JavaScript bridge then collects every named field of the forms on Apple's page and passes them to Kotlin as one JSON object.
6. The library checks that the returned `state` matches the one it sent, closes the activity and resolves with the credential.

The credential has the same shape as on iOS. The library fills `user.id` from the identity token's `sub` claim and takes the email and the first and last name from Apple's `user` field when it is present. Apple's web flow sends no middle name, prefix, suffix, or nickname, so `middleName`, `namePrefix`, `nameSuffix`, and `nickname` are always `null`. `realUserStatus` is always `'unknown'`.

## What the redirect URL has to serve

Nothing that the library reads. The token comes from the form on Apple's page, which the activity reads before your page would load, and the response of your redirect URL is never used. The URL still has to be a real HTTPS URL registered on the Services ID, because Apple checks it before it shows the sign-in page.

The activity stops the page load but does not block the network request itself, so the server at that URL may still receive Apple's `POST` with the code and token.

## Cancel and errors

The user can leave the sign-in screen with the close button or the system back action, which the activity handles through `OnBackPressedDispatcher`. Both end the flow with `ERR_REQUEST_CANCELED`, and so does the system destroying the activity before a result arrives. `AppleButton` reports it through `onCancel`, and the `signIn` function of `useAppleAuth` resolves with `null` unless you set `treatCancelAsError`.

| Situation | Code |
| --- | --- |
| The user closed the screen or went back | `ERR_REQUEST_CANCELED` |
| The activity was destroyed before a result arrived | `ERR_REQUEST_CANCELED` |
| Apple's form had no `state`, or none of `id_token`, `code` and `user` | `ERR_REQUEST_CANCELED` |
| The form had a `state` and a `code` or `user`, but no `id_token` | `ERR_MISSING_IDENTITY_TOKEN` |
| The returned state did not match (`OAuth state does not match.`) | `ERR_INVALID_RESPONSE` |
| The form data could not be read (`Apple returned an unreadable form response.`) | `ERR_INVALID_RESPONSE` |
| A sign-in was already running (`A Sign in with Apple request is already in progress.`) | `ERR_REQUEST_FAILED` |
| No application context was available (`No Android application context is available.`) | `ERR_REQUEST_FAILED` |
| `clientId` or `redirectUri` was missing | `ERR_NOT_CONFIGURED` |

Only one sign-in can run at a time, so a second `signIn` call while the screen is open rejects with `ERR_REQUEST_FAILED`.

`AppleAuth.getCredentialState` has no native check on Android and always returns `'unknown'`. Android receives no revocation event either, so `AppleAuth.addRevokeListener` returns a subscription whose `remove()` does nothing.
