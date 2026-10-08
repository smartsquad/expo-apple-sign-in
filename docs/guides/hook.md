# useAppleAuth hook

`useAppleAuth` wraps `AppleAuth` in React state. It tracks the loading flag, the last credential, the last error, and whether Sign in with Apple is available on the device, so a custom control can render each state without extra bookkeeping. Use it when the stock [Apple button](/guides/button) does not fit your layout, or when you want the sign-in state in a component.

## Options

`useAppleAuth(options?)` accepts the same fields as [`AppleAuth.configure`](/guides/usage#configure) plus one hook-only flag.

| Option | Type | Default | Description |
|---|---|---|---|
| `clientId` | `string` | none | Services ID. Required on Android and web, ignored on iOS. |
| `redirectUri` | `string` | none | HTTPS redirect URI registered for the Services ID. Required on Android and web, ignored on iOS. |
| `scopes` | `AppleScope[]` | `['name', 'email']` | Default scopes for sign-ins started by the hook. |
| `treatCancelAsError` | `boolean` | `false` | When `true`, a cancel is stored in `error` and thrown like any other failure. |

When any of `clientId`, `redirectUri`, or `scopes` is set, an effect passes the three options to `AppleAuth.configure`. `configure` skips `undefined` values, so an option you leave out of the hook keeps the value from an earlier `configure` call. The effect depends on the option values, so declare an array of `scopes` outside the component to avoid a call on every render.

## Returned values

| Field | Type | Description |
|---|---|---|
| `signIn` | `() => Promise<AppleCredential \| null>` | Starts the flow. Takes no arguments. Resolves with the credential, or with `null` when the person cancels. |
| `signOut` | `() => Promise<void>` | Clears the in-memory credential and the error. Apple has no sign-out API, so end your own session as well. |
| `credential` | `AppleCredential \| null` | Last successful credential. Starts from `AppleAuth.getCurrentCredential()`. |
| `isLoading` | `boolean` | `true` while a sign-in runs. |
| `error` | `AppleAuthError \| null` | Last failure. Reset to `null` when the next sign-in starts. |
| `isAvailable` | `boolean` | Result of `AppleAuth.isAvailable()`. It is `false` until the check resolves after the first render. |
| `isConfigured` | `boolean` | Result of `AppleAuth.isConfigured()` on every render. |

The hook's `signIn` takes no options. To pass a custom `nonce`, `state`, or per-call `scopes`, call [`AppleAuth.signIn`](/guides/usage#sign-in) directly.

## Cancel behavior

A dismissed Apple sheet is a normal outcome, so by default `signIn` resolves with `null`, leaves `error` as `null`, and does not throw. Check the return value before you use it.

Every other failure is normalized into an [`AppleAuthError`](/guides/errors), stored in `error`, and thrown. Catch it at the call site or read it from state.

Set `treatCancelAsError: true` when a cancel must follow the same path as a failure. The hook then stores the cancel error (`ERR_REQUEST_CANCELED`) in `error` and throws it.

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
- API reference has the exact signature.
