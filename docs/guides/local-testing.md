# Test locally

This page walks through signing in with real Apple accounts from the example app on a desktop browser, a phone browser, an Android device, and an iPhone, all from your own machine. Web and Android identify the app by a Services ID and send Apple to a Return URL, and Apple rejects `localhost` and IP addresses as domains and Return URLs. A tunnel gives your local server an HTTPS host that Apple accepts, so web and Android go through one. iOS uses the App ID of the signed build instead, so it needs no tunnel, no Services ID and no redirect URI.

## What you need

- An Apple Developer account with a web Services ID that has Sign in with Apple enabled, as described in [Apple Developer](/setup/apple-developer). The examples use `com.example.app.web`.
- `cloudflared` for the tunnel. On macOS, install it with `brew install cloudflared`.
- For Android, a device with USB debugging turned on, connected over USB.
- For iOS, an iPhone connected over USB, with Developer Mode enabled and the Mac trusted. You also need an App ID in your team that has Sign in with Apple enabled, and you set it as the bundle identifier in [Test on an iPhone](#test-on-an-iphone).

## Build the library and the example

The example depends on the library through `file:..`, and the example's web server imports `expo-apple-sign-in/server` from the built files, so build the library first. From the repository root:

```bash
npm install
npm run build
cd example
npm install
```

## Open a tunnel

Start a Cloudflare quick tunnel that points at port 43181, the port that the example's web server uses. The tunnel can start before the server does.

```bash
HOME="$(mktemp -d)" cloudflared tunnel --url http://127.0.0.1:43181
```

The temporary `HOME` keeps `cloudflared` from loading `~/.cloudflared/config.yml`, which can describe a named tunnel. With the temporary `HOME`, `cloudflared` logs that it cannot determine a default configuration path and prints a `https://<host>` URL on `trycloudflare.com` within seconds. Keep this terminal open, and note the host. The rest of the page calls it `<host>`.

## Register the tunnel on the Services ID

In the Apple Developer portal, open the web Services ID and edit its Sign in with Apple configuration. Under **Domains and Subdomains**, add `<host>`. Under **Return URLs**, add `https://<host>/auth/callback`. Save the configuration.

## Point the example at the tunnel

Create `example/.env` with the Services ID and the Return URL:

```bash [example/.env]
EXPO_PUBLIC_APPLE_SERVICE_ID=com.example.app.web
EXPO_PUBLIC_APPLE_REDIRECT_URI=https://<host>/auth/callback
```

The example uses these two values on web and on Android. iOS ignores them. Expo inlines `EXPO_PUBLIC_*` values when it bundles, so a change to `example/.env` only takes effect after a new export or a new build.

## Test web

From `example/`, export the web app and serve it:

```bash
npm run web:serve
```

The script exports the app to `example/dist` and serves it at `http://127.0.0.1:43181`. The tunnel forwards `https://<host>` to that address.

Open `https://<host>` in a desktop browser and press the button. The example sets `webMode: 'auto'`, so a desktop browser signs in through the popup. Open the same URL on a phone to sign in through the redirect: the tab goes to Apple, Apple posts the result to `https://<host>/auth/callback`, and the app loads again with the credential. See [Web](/setup/web#choose-a-web-mode) for the two modes.

The server prints one line per request with the method, the path and the status. A redirect sign-in from a phone appears as `POST /auth/callback 200` followed by `GET / 200`.

A successful sign-in replaces the status line with three lines: `user: …`, `email: …` and `token: N characters`.

## Test on an Android device

Android needs the Services ID, the Return URL and the same `example/.env` as web, so complete the steps above first. Then list the connected devices and note the device id:

```bash
adb devices -l
```

Build the release variant and run it on that device:

```bash
NODE_ENV=production npx expo run:android --device <id> --variant release
```

The first build takes about five minutes. The command installs `app-release.apk` and opens the app. The release variant embeds the JavaScript bundle, so the phone needs no Metro server. If your shell exports `NODE_ENV`, set it to `production` for release builds, as the command shows.

Press the button in the app. The sign-in works with the same Services ID and the same tunnel Return URL as web. The tunnel server log shows no request from an Android sign-in, because the Android activity reads Apple's form inside the WebView (see [What the redirect URL has to serve](/setup/android#what-the-redirect-url-has-to-serve)). On Android the Return URL has to be registered on the Services ID, and nothing has to answer it.

## Test on an iPhone

iOS signs in with the App ID of `ios.bundleIdentifier`, so the Services ID, the redirect URI and the tunnel play no part. The signing team and the bundle identifier come from the native project. An App ID is unique across all Apple teams, so set `ios.bundleIdentifier` in `example/app.json` to an App ID in your own team that has Sign in with Apple enabled.

If `example/ios` already exists from an earlier build, a change to `app.json` alone does not update it. Set the bundle identifier and the team in Xcode under **Signing & Capabilities**, or regenerate the project with the following command, which deletes and recreates `example/ios`:

```bash
npx expo prebuild --platform ios --clean
```

List the connected devices and note the UDID of the iPhone. Device names can repeat, so pass the UDID:

```bash
xcrun devicectl list devices
```

Build the release configuration and run it on that iPhone:

```bash
NODE_ENV=production npx expo run:ios --device <UDID> --configuration Release
```

The command runs `pod install`, builds, installs and launches the app. After the install it also starts Metro, which a Release build does not need, so stop it with Ctrl+C. Press the button in the app to sign in.

The iOS Simulator also works when an Apple Account is signed in on it. [The iOS Simulator cannot sign in](/reference/troubleshooting#the-ios-simulator-cannot-sign-in) lists the symptom and the fix, and [iOS](/setup/ios#test-on-a-simulator-or-a-device) shows the `npx expo run:ios` commands for it.

## Each new tunnel

A quick tunnel gets a new host every time it starts. After a restart, register the new host and the new `https://<host>/auth/callback` on the Services ID, update both values in `example/.env`, and export the web app again with `npm run web:serve` or rebuild the Android app.

## Clean up

Stop the web server and the tunnel with Ctrl+C. Removing the old host and Return URL from the Services ID is optional.

## Supabase and other providers

The example app does not call Supabase. When you test the [Supabase adapter](/providers/supabase) in your own app, Supabase compares the audience of the identity token with the Client IDs of its Apple provider. Tokens from web and Android carry the Services ID, and tokens from iOS carry the App ID, which is the bundle identifier. List both in the **Client IDs** field, as the Supabase page describes.
