# expo-apple-sign-in

Sign in with Apple for Expo, with one API on iOS, Android, and web.

> [!IMPORTANT]
> **Expo SDK 58 only.** The native code is written with Expo Modules 2.0 (`@ExpoModule` and `@JS`), which earlier SDKs do not support.

## Install

```bash
npx expo install expo-apple-sign-in
```

Add the config plugin to `app.json`, then build a development client. Expo Go cannot load the native module.

```json
{
  "expo": {
    "plugins": ["expo-apple-sign-in"]
  }
}
```

```bash
npx expo prebuild
npx expo run:ios
```

## Usage

On iOS the library signs in with your app's App ID, so it needs no configuration. Android and web open Apple's web flow, which needs a Services ID and an HTTPS return URL registered in the Apple Developer portal.

```tsx
import { AppleAuth, AppleButton } from 'expo-apple-sign-in'

AppleAuth.configure({
  clientId: 'com.example.app.service',
  redirectUri: 'https://app.example.com/auth/callback',
})

export function SignInScreen() {
  return (
    <AppleButton
      buttonStyle="black"
      buttonType="signIn"
      onSuccess={(credential) => console.log(credential.user.id)}
      onError={(error) => console.warn(error.code)}
    />
  )
}
```

`AppleAuth.signIn()` returns the same credential on every platform. It hashes the nonce with SHA-256 before sending it to Apple and puts the raw nonce on `credential.nonce`, which is the value Supabase, Clerk, and Firebase expect.

## Auth providers

```ts
import { signInWithSupabase } from 'expo-apple-sign-in/supabase'

await signInWithSupabase(supabase)
```

Clerk and Firebase have their own adapters at `expo-apple-sign-in/clerk` and `expo-apple-sign-in/firebase`.

## License

MIT
