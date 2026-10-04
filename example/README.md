# Apple Sign In Example

Compact Expo SDK 58 app that links `expo-apple-sign-in` (`file:..`) and shows the HIG `AppleButton`.

<p>
  <img alt="Supports Expo iOS" src="https://img.shields.io/badge/iOS-4630EB.svg?style=flat-square&logo=APPLE&labelColor=999999&logoColor=fff" />
  <img alt="Supports Expo Android" src="https://img.shields.io/badge/Android-4630EB.svg?style=flat-square&logo=ANDROID&labelColor=A4C639&logoColor=fff" />
  <img alt="Supports Expo Web" src="https://img.shields.io/badge/web-4630EB.svg?style=flat-square&logo=GOOGLE-CHROME&labelColor=4285F4&logoColor=fff" />
</p>

## Expo Go

**Not compatible with Expo Go** on iOS or Android. This package ships a custom Expo Modules 2.0 native module (`ExpoAppleSignIn`). Expo Go only includes modules that ship inside the Go client.

Use a **development build**:

```sh
npx expo run:ios
npx expo run:android
```

Web does not need that native module. `npm run web` works in a browser.

## How to use

```sh
# from the repo root
npm install
cd example
npm install
npm run start
```

| Script | What it does |
| --- | --- |
| `npm run start` | Expo CLI |
| `npm run web` | Web on port `43180` |
| `npm run ios` | Dev client + iOS |
| `npm run android` | Dev client + Android |

### Android + web

Set a Services ID and HTTPS Return URL (optional on iOS):

```sh
export EXPO_PUBLIC_APPLE_SERVICE_ID=com.example.app.service
export EXPO_PUBLIC_APPLE_REDIRECT_URI=https://your-app.com/auth/callback
```

Or put the same keys in `example/.env`.

## The idea behind the example

Same shape as [expo/examples](https://github.com/expo/examples): one `App.tsx`, a short `README`, and the smallest `package.json` that still links the sibling module. The button calls `AppleAuth.signIn()`; the credential already includes the **raw** nonce for Supabase / Clerk / Firebase.
