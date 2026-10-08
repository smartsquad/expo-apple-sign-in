# Supabase

Supabase accepts an Apple identity token directly through `signInWithIdToken`, so the app needs no browser redirect and no Supabase-side OAuth secret. This page covers the dashboard setting that makes Supabase accept your tokens, the two ways to call `signInWithIdToken` from `expo-apple-sign-in` (the `signInWithSupabase` adapter and a manual call), and how to keep the user's name, which Apple sends only once. The flow is identical on iOS, Android, and web.

Supabase's own Expo guide uses `expo-apple-authentication` on iOS and a browser-based OAuth flow on Android. With `expo-apple-sign-in` the app obtains an identity token natively on all three platforms and hands it to the same Supabase call, so there is one code path to maintain.

## Configure the Supabase dashboard

Open **Authentication**, then **Sign In / Providers**, then **Apple**, and enable the provider. Supabase checks the `aud` claim of every identity token against the **Client IDs** field, so that field has to list every identifier your app signs in with:

- The bundle ID of each iOS build, for example `com.example.app`, plus variants such as `com.example.app.dev`.
- The Services ID you pass as `clientId` to `AppleAuth.configure` on Android and web, for example `com.example.app.web`. Separate the values with commas.

Do not add `host.exp.Exponent`. That identifier belongs to Expo Go, and this library needs a development build. See [Requirements](/getting-started/requirements).

Sign-in with a token needs no OAuth secret. The `.p8` key and the secret derived from it (which Supabase asks you to rotate every six months) apply only to Supabase's own redirect-based OAuth flow, which this page does not use. If you still need the Services ID and the app identifiers, the [Apple Developer](/setup/apple-developer) page explains where they come from.

## Install the client

Add `expo-apple-sign-in` as described in [Installation](/getting-started/installation), then add the Supabase client.

::: code-group

```sh [npm]
npx expo install @supabase/supabase-js
```

```sh [yarn]
yarn expo install @supabase/supabase-js
```

```sh [pnpm]
pnpm expo install @supabase/supabase-js
```

```sh [bun]
bunx expo install @supabase/supabase-js
```

:::

The samples import the client from `lib/supabase.ts`. Session persistence for React Native is configured on the client the way Supabase's Expo guide describes, and the adapter does not depend on it.

```ts [lib/supabase.ts]
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL as string,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string
)
```

## Sign in with the adapter

`signInWithSupabase(supabase)` runs `AppleAuth.signIn()`, then calls `supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: credential.nonce })`. It resolves with `{ credential, data }`. It throws an `AppleAuthError` with code `ERR_MISSING_IDENTITY_TOKEN` if Apple returns no token.

Because the adapter does the sign-in itself, call it from `onPress` of `AppleButton`. When you pass `onPress`, the button skips its own `AppleAuth.signIn()` call, so the user sees one Apple sheet.

`data` is the value Supabase returns, which is a `{ data, error }` object. Supabase reports a rejected token through `error` instead of throwing, so read it before you treat the sign-in as successful.

```tsx [components/AppleSignIn.tsx]
import type { AuthTokenResponse } from '@supabase/supabase-js'
import { AppleButton, isCancelledError, signInWithSupabase } from 'expo-apple-sign-in'
import { useState, type ReactElement } from 'react'
import { Text, View } from 'react-native'

import { supabase } from '../lib/supabase'

export function AppleSignIn(): ReactElement {
  const [message, setMessage] = useState<string | null>(null)

  const handlePress = async (): Promise<void> => {
    setMessage(null)
    try {
      const { credential, data } = await signInWithSupabase(supabase)
      const { error } = data as AuthTokenResponse
      if (error) {
        setMessage(error.message)

        return
      }

      const { givenName, familyName } = credential.user
      if (givenName || familyName) {
        const fullName = [givenName, familyName].filter(Boolean).join(' ')
        await supabase.auth.updateUser({
          data: { full_name: fullName, given_name: givenName, family_name: familyName },
        })
      }
    } catch (error) {
      if (!isCancelledError(error)) {
        setMessage(error instanceof Error ? error.message : 'Sign in with Apple failed.')
      }
    }
  }

  return (
    <View>
      <AppleButton onPress={handlePress} />
      {message ? <Text>{message}</Text> : null}
    </View>
  )
}
```

`isCancelledError` returns `true` when the user dismisses the Apple sheet, which is not a failure worth showing. The [Errors](/guides/errors) page lists the other codes.

## Sign in manually

If you want to own the Supabase call, let `AppleButton` run the sign-in and use `onSuccess`. The button passes the credential to `onSuccess`, and you send `identityToken` and the raw `nonce` yourself.

```tsx [components/AppleSignInManual.tsx]
import { AppleButton } from 'expo-apple-sign-in'
import type { TAppleCredential } from 'expo-apple-sign-in'
import { useState, type ReactElement } from 'react'
import { Text, View } from 'react-native'

import { supabase } from '../lib/supabase'

export function AppleSignInManual(): ReactElement {
  const [message, setMessage] = useState<string | null>(null)

  const handleSuccess = async (credential: TAppleCredential): Promise<void> => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: credential.nonce,
    })
    if (error) {
      setMessage(error.message)
    }
  }

  return (
    <View>
      <AppleButton onSuccess={handleSuccess} onError={(error) => setMessage(error.message)} />
      {message ? <Text>{message}</Text> : null}
    </View>
  )
}
```

`onError` receives an `AppleAuthError`, and a cancel goes to `onCancel` instead, so it never reaches `onError`. Do not use `signInWithSupabase` and `onSuccess` together, because both would start a sign-in.

::: warning Do not hash the nonce again
`credential.nonce` is the raw value. The library already sent its SHA-256 hash to Apple, and Supabase hashes the raw value you pass and compares the result with the `nonce` claim inside the token. Passing a hash makes the comparison fail. If you supply your own nonce through `AppleAuth.signIn({ nonce })`, give it unhashed as well.
:::

## Keep the user's name

Apple returns the full name only the first time a person authorizes your app, and never inside the identity token. `credential.user.givenName` and `credential.user.familyName` are `null` on every later sign-in, so save them in the same call chain that created the session. The adapter sample above does that with `supabase.auth.updateUser`, which writes `full_name`, `given_name`, and `family_name` to the user's metadata. The email, which can be a private relay address, is already part of the Supabase user created from the token.

Apple's name and email facts are explained in [Usage](/guides/usage#what-the-credential-contains).

## Next steps

- [Backend verification](/guides/backend) for the checks Supabase performs on your behalf, if you also run your own server.
- [Android](/setup/android) and [Web](/setup/web) for the Services ID and redirect URI that Supabase must list in **Client IDs**.
