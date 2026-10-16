# Expo config

`expo-apple-sign-in` touches the Expo config in one place: its config plugin, which turns on Sign in with Apple for iOS when the native projects are generated. The Android and web settings are runtime values passed to `AppleAuth.configure`, and Expo's `EXPO_PUBLIC_` environment variables let you supply them per environment without editing code.

## Add the plugin

List the plugin by name. It takes no options.

::: code-group

```json [app.json]
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.example.app"
    },
    "plugins": ["expo-apple-sign-in"]
  }
}
```

```ts [app.config.ts]
import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'My App',
  slug: 'my-app',
  ios: {
    bundleIdentifier: 'com.example.app',
  },
  plugins: ['expo-apple-sign-in'],
}

export default config
```

:::

## What the plugin writes

The plugin makes two changes to the iOS project and nothing else:

1. It writes the `com.apple.developer.applesignin` entitlement with the value `["Default"]` into the app's entitlements file.
2. It sets `CFBundleAllowMixedLocalizations` to `true` in `Info.plist`, unless the app already defines that key, so the system Sign in with Apple sheet follows the device language.

The plugin adds no other key to the Expo config. If prebuild prints a warning that asks you to install `expo-apple-authentication`, see [Troubleshooting](/reference/troubleshooting#prebuild-warns-about-expo-apple-authentication).

Android and web need no native configuration. The Android sign-in activity is declared in the library's own manifest and merges into your app at build time, and web loads Apple JS at runtime in popup mode. Web redirect mode needs a server route instead, as [Web](/setup/web#answer-apple-s-post) explains.

The plugin's source is `plugin/src/with-expo-apple-sign-in.ts`. The package ships it compiled in `plugin/build`, and `app.plugin.js` at the package root loads it from there. It is wrapped in `createRunOncePlugin` under the package name, so it runs once per prebuild even when the config lists it twice.

The plugin only runs when Expo generates the native projects. After you add it, or after any change to the iOS part of the config, regenerate the projects:

```bash
npx expo prebuild --clean
```

If your project commits its `ios` folder instead of generating it, config plugins do not run on build. In that case, add the Sign in with Apple capability to the target in Xcode, and add the Boolean key `CFBundleAllowMixedLocalizations` with the value `YES` to `Info.plist` so the sheet follows the device language.

## Pass the Services ID through environment variables

Android and web need a Services ID and a redirect URI at runtime. Expo inlines variables whose names start with `EXPO_PUBLIC_` into the JavaScript bundle, so you can keep these values out of the source and change them per environment. The example app reads two variables:

```bash [.env]
EXPO_PUBLIC_APPLE_SERVICE_ID=com.example.app.web
EXPO_PUBLIC_APPLE_REDIRECT_URI=https://app.example.com/auth/callback
```

Read them where you configure the library, and skip the call when they are not set, so iOS builds keep working without them:

```ts [appleAuth.ts]
import { AppleAuth } from 'expo-apple-sign-in'

const clientId = process.env.EXPO_PUBLIC_APPLE_SERVICE_ID
const redirectUri = process.env.EXPO_PUBLIC_APPLE_REDIRECT_URI

if (clientId && redirectUri) {
  AppleAuth.configure({ clientId, redirectUri })
}
```

Import this module once from your root component or layout, before the first sign-in. Write `process.env.EXPO_PUBLIC_...` in full, as above, so Expo can replace each reference at build time.

Everything in an `EXPO_PUBLIC_` variable ends up in the app bundle and anyone can read it. A Services ID and a Return URL are public values, so they are safe there. A `.p8` key, a client secret or any other credential is not.

## Build with EAS

EAS Build generates the native projects with the same config plugins, so the entitlement reaches EAS builds without extra steps. When EAS manages your iOS credentials, the provisioning profile it uses must come from an App ID with Sign in with Apple enabled, the same requirement as a local build.

A `.env` file that `.gitignore` excludes is not uploaded with the project, so set the two `EXPO_PUBLIC_` values for EAS builds in the build profile's `env` block, or as EAS environment variables:

```json [eas.json]
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_APPLE_SERVICE_ID": "com.example.app.web",
        "EXPO_PUBLIC_APPLE_REDIRECT_URI": "https://app.example.com/auth/callback"
      }
    }
  }
}
```

The Sign in with Apple key is not part of the app or of its EAS credentials. EAS credentials cover signing the iOS and Android binaries. The `.p8` key, when you need one, belongs on your server or in your auth provider's dashboard, as described in [Apple Developer](/setup/apple-developer).
