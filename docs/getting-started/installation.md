# Installation

**expo-apple-sign-in requires Expo SDK 58.** The native code is written with Expo Modules 2.0, which earlier SDKs do not support, and Expo Go cannot load it, so iOS and Android need a development build.

Installing the library takes three steps: add the package, register its config plugin, and rebuild the native app so the new module and the Sign in with Apple entitlement are compiled in. Afterwards, `AppleAuth.isAvailable()` tells you whether the module loaded.

## Install the package

Run the install command from your project root:

::: code-group

```bash [npm]
npx expo install expo-apple-sign-in
```

```bash [yarn]
yarn expo install expo-apple-sign-in
```

```bash [pnpm]
pnpm expo install expo-apple-sign-in
```

```bash [bun]
bunx expo install expo-apple-sign-in
```

:::

## Add the config plugin

Add `"expo-apple-sign-in"` to the `plugins` array of your Expo config. The plugin sets `ios.usesAppleSignIn` to `true` and writes the `com.apple.developer.applesignin` entitlement into the iOS project. It changes nothing for Android or web.

::: code-group

```json [app.json]
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
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

The `bundleIdentifier` must match an App ID that has Sign in with Apple enabled in your Apple Developer account. [Expo config](/setup/expo) explains what the plugin writes and how to pass the Android and web settings through environment variables.

## Build the native app

A config plugin only takes effect when the native projects are generated, and a JavaScript reload cannot add a native module to an app that is already installed. Generate the projects and run a development build:

```bash
npx expo prebuild
npx expo run:ios
npx expo run:android
```

If the project already has `ios` and `android` folders from an earlier prebuild, run `npx expo prebuild --clean` to regenerate them from the current config.

EAS Build works too. When EAS generates the native projects during a build, it runs the same config plugin, so development and store builds from EAS include the entitlement without extra steps.

## Confirm the module loaded

`AppleAuth.isAvailable()` resolves `true` when the native module is linked on iOS and Android, and when the code runs in a browser page on web. Render its result once after the build finishes:

```tsx [App.tsx]
import { useEffect, useState, type ReactElement } from 'react'
import { Text, View } from 'react-native'
import { AppleAuth } from 'expo-apple-sign-in'

export default function App(): ReactElement {
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    void AppleAuth.isAvailable().then(setAvailable)
  }, [])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Sign in with Apple available: {String(available)}</Text>
    </View>
  )
}
```

If the app shows `false` on iOS or Android, the build does not contain the native module. On iOS, and on Android once `AppleAuth.configure` has run, `AppleAuth.signIn()` then rejects with `ERR_NOT_AVAILABLE` and a message that starts with `ExpoAppleSignIn native module is not linked.` Check that the plugin is listed, then run `npx expo prebuild --clean` and build again. [Troubleshooting](/reference/troubleshooting) covers the other common causes.

With the module in place, continue with [Apple Developer](/setup/apple-developer) to create the identifiers, or go straight to the [Quick start](/getting-started/quick-start).
