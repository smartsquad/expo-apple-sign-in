# useAppleAuth hook

`useAppleAuth` wraps `AppleAuth` in React state. It tracks the loading flag, the last credential, the last error, and whether Sign in with Apple is available on the device, so a custom control can render each state without extra bookkeeping. On iOS it also clears the credential when Apple reports that the person revoked access. Use it when the stock [Apple button](/guides/button) does not fit your layout, or when you want the sign-in state in a component.

## Options

```ts
function useAppleAuth(options?: TUseAppleAuthOptions): TUseAppleAuthResult
```

The `options` object accepts the same fields as [`AppleAuth.configure`](/guides/usage#configure) plus one hook-only flag.

| Option | Type | Default | Description |
|---|---|---|---|
| `clientId` | `string` | none | Services ID. Required on Android and web, ignored on iOS. |
| `redirectUri` | `string` | none | HTTPS redirect URI registered for the Services ID. Required on Android and web, ignored on iOS. |
| `scopes` | `AppleScope[]` | `['name', 'email']` | Default scopes for sign-ins started by the hook. |
| `treatCancelAsError` | `boolean` | `false` | When `true`, a cancel is stored in `error` and thrown like any other failure. |

When any of `clientId`, `redirectUri`, or `scopes` is set, an effect passes the three options to `AppleAuth.configure`. `configure` skips `undefined` values, so an option you leave out of the hook keeps the value from an earlier `configure` call. The effect compares `scopes` by value, so an inline array such as `scopes: ['name', 'email']` does not trigger a new `configure` call on every render.

## Returned values

`useAppleAuth` returns a `TUseAppleAuthResult` object, also exported as `UseAppleAuthResult`, with the fields below.

| Field | Type | Description |
|---|---|---|
| `signIn` | `(options?: AppleSignInOptions) => Promise<AppleCredential \| null>` | Starts the flow and passes `options` to `AppleAuth.signIn`. Resolves with the credential, or with `null` when the person cancels. |
| `signOut` | `() => Promise<void>` | Clears the in-memory credential and the error. Apple has no sign-out API, so end your own session as well. |
| `credential` | `AppleCredential \| null` | Last successful credential. Starts from `AppleAuth.getCurrentCredential()`. |
| `isLoading` | `boolean` | `true` while a sign-in runs. |
| `error` | `AppleAuthError \| null` | Last failure. Reset to `null` when the next sign-in starts. |
| `isAvailable` | `boolean` | Result of `AppleAuth.isAvailable()`. It is `false` until the check resolves after the first render, and stays `false` when the check fails. |
| `isConfigured` | `boolean` | Result of `AppleAuth.isConfigured()`, kept current across `AppleAuth.configure` calls made by this hook or anywhere else in the app. |

The hook's `signIn` accepts the per-call options of [`AppleAuth.signIn`](/guides/usage#sign-in): `nonce`, `state`, and `scopes`. For example, `signIn({ nonce })` sends a raw nonce that your server issued, and the library hashes it as usual.

## Cancel behavior

A dismissed Apple sheet is a normal outcome, so by default `signIn` resolves with `null`, leaves `error` as `null`, and does not throw. Check the return value before you use it.

Every other failure is normalized into an [`AppleAuthError`](/guides/errors), stored in `error`, and thrown. Catch it at the call site or read it from state.

Set `treatCancelAsError: true` when a cancel must follow the same path as a failure. The hook then stores the cancel error (`ERR_REQUEST_CANCELED`) in `error` and throws it.

## Revocation

While the component is mounted, the hook subscribes to [`AppleAuth.addRevokeListener`](/guides/usage#listen-for-revocation). When Apple reports on iOS that the person revoked Sign in with Apple for your app, the hook calls `AppleAuth.signOut()` and sets `credential` to `null`. It does not end your own session, so react to `credential` becoming `null`, or add your own listener, to sign out of your backend too. On Android and web the event never fires.

## Complete example

The component below renders a loading indicator, an error message, and a disabled button when Sign in with Apple is not available. Errors reach the screen through the hook state, so the call site discards the thrown error.

```tsx [SignInScreen.tsx]
import { AppleButton, useAppleAuth } from 'expo-apple-sign-in'
import type { TAppleCredential, TUseAppleAuthOptions } from 'expo-apple-sign-in'
import type { ReactElement } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

const EAppleOptions: TUseAppleAuthOptions = {
  clientId: 'com.example.app.web',
  redirectUri: 'https://app.example.com/auth/apple',
  scopes: ['name', 'email'],
}

type TSignInScreenProps = {
  onSignedIn: (credential: TAppleCredential) => void
}

export function SignInScreen({ onSignedIn }: TSignInScreenProps): ReactElement {
  const { signIn, credential, isLoading, error, isAvailable, isConfigured } = useAppleAuth(EAppleOptions)

  async function handlePress(): Promise<void> {
    const next = await signIn().catch(() => null)

    if (next) {
      onSignedIn(next)
    }
  }

  if (credential) {
    return (
      <View>
        <Text>Signed in as {credential.user.email ?? credential.user.id}</Text>
      </View>
    )
  }

  return (
    <View style={{ gap: 12, padding: 24 }}>
      <AppleButton onPress={handlePress} disabled={!isAvailable || !isConfigured || isLoading} />
      {isLoading ? <ActivityIndicator /> : null}
      {!isConfigured ? <Text>Set a Services ID and a redirect URI to sign in on this platform.</Text> : null}
      {error ? <Text>{`${error.code}: ${error.message}`}</Text> : null}
    </View>
  )
}
```

Because the example passes `onPress`, the button does not run its own sign-in and does not show its own spinner, so `isLoading` from the hook drives the indicator and the `disabled` state.

## Related

- [Errors](/guides/errors) lists every code the hook can put into `error`.
- [Usage](/guides/usage) covers the headless API the hook is built on.
- [API reference](/reference/api#hook) has the exact signature.
