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
| `npm run web` | Web dev server on port `43180` (popup sign-in only) |
| `npm run web:export` | Static web export to `example/dist` |
| `npm run web:serve` | Export, then serve it on port `43181` and answer Apple's POST |
| `npm run ios` | Dev client + iOS |
| `npm run android` | Dev client + Android |

### Android + web

Set a Services ID and an HTTPS Return URL (optional on iOS):

```sh
export EXPO_PUBLIC_APPLE_SERVICE_ID=com.example.app.web
export EXPO_PUBLIC_APPLE_REDIRECT_URI=https://app.example.com/auth/callback
```

Or put the same keys in `example/.env`.

Apple rejects `localhost` and IP addresses as Return URLs, so web sign-in needs an HTTPS host. `npm run web` serves the app through the Expo dev server, which cannot answer Apple's POST, so it only runs popup sign-in.

`npm run web:serve` serves the export on `http://127.0.0.1:43181` and answers the POST to any path, so popup and redirect sign-in both work behind an HTTPS tunnel that points at that port. The server imports `expo-apple-sign-in/server` from the repository build, so run `npm run build` in the repository root first. The full walkthrough for web, Android, and iPhone is at [exsi.smartsquad.io/guides/local-testing](https://exsi.smartsquad.io/guides/local-testing.html).

## The idea behind the example

Same shape as [expo/examples](https://github.com/expo/examples): one `App.tsx`, a short `README`, and the smallest `package.json` that still links the sibling module. The button calls `AppleAuth.signIn()`; the credential already includes the **raw** nonce for Supabase / Clerk / Firebase.
