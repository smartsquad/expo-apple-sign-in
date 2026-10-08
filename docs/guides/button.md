# Apple button

`AppleButton` is a JavaScript button that renders the Sign in with Apple appearance on iOS, Android, and web. It draws the Apple mark and the official label itself, so the look is identical on every platform and stays configurable (style, type, size, corner radius), and it can run the whole sign-in on press. This page lets you try the options live, lists every prop, and explains when to take over the press with `onPress`.

<script setup>
import AppleButtonPlayground from '../.vitepress/theme/components/AppleButtonPlayground.vue'
</script>

<AppleButtonPlayground />

## Basic use

With no `onPress`, the button calls `AppleAuth.signIn()` for you, shows a spinner while it runs, and reports the outcome through `onSuccess`, `onCancel`, and `onError`.

```tsx [SignIn.tsx]
import { AppleButton } from 'expo-apple-sign-in'
import type { ReactElement } from 'react'
import { Alert } from 'react-native'

export function SignIn(): ReactElement {
  return (
    <AppleButton
      buttonType="continue"
      onSuccess={(credential) => {
        Alert.alert('Signed in', `Apple user ${credential.user.id ?? 'unknown'}`)
      }}
      onError={(error) => {
        Alert.alert('Sign in failed', `${error.code}: ${error.message}`)
      }}
    />
  )
}
```

A dismissed sheet calls `onCancel` and never `onError`. Configure Android and web once with `AppleAuth.configure`, as described in [Usage](/guides/usage#configure).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onPress` | `() => void` | none | Custom press handler. When set, the button does not call `AppleAuth.signIn()` and never calls `onSuccess`, `onError`, or `onCancel`. |
| `onSuccess` | `(credential: AppleCredential) => void` | none | Called with the credential after a successful built-in sign-in. |
| `onError` | `(error: AppleAuthError) => void` | none | Called when the built-in sign-in fails for any reason except a cancel. |
| `onCancel` | `() => void` | none | Called when the person dismisses the Apple sheet. |
| `buttonStyle` | `'black' \| 'white' \| 'whiteOutline'` | `'black'` | Color scheme of the button. |
| `buttonType` | `'signIn' \| 'continue' \| 'signUp'` | `'signIn'` | Picks the official label. |
| `label` | `string` | label of `buttonType` | Replaces the label text. |
| `cornerRadius` | `number` | `8` | Corner radius in points. |
| `height` | `number` | `48` | Button height. `APPLE_BUTTON_HEIGHT` exports the default. |
| `width` | `number` or a percentage string | `'100%'` | Button width, for example `240` or `'80%'`. |
| `disabled` | `boolean` | `false` | Disables presses and dims the button to 50% opacity. |
| `style` | `StyleProp<ViewStyle>` | none | Extra styles applied after the defaults, so they win. |
| `textStyle` | `StyleProp<TextStyle>` | none | Extra styles for the label text. |
| `children` | `ReactNode` | none | Replaces the Apple mark and the label with your own content. |

The button also sets a minimum width of 200 points, horizontal padding of 16 points, and a pressed opacity of 0.86. It exposes the `button` accessibility role and uses the label as its accessibility label.

## Styles and types

`buttonStyle` selects one of three palettes.

| Value | Background | Mark and text | Border |
|---|---|---|---|
| `black` | `#000000` | `#ffffff` | none |
| `white` | `#ffffff` | `#000000` | none |
| `whiteOutline` | `#ffffff` | `#000000` | black, two hairline widths |

`buttonType` selects the official label and the accessibility label.

| Value | Label |
|---|---|
| `signIn` | Sign in with Apple |
| `continue` | Continue with Apple |
| `signUp` | Sign up with Apple |

The type only changes the label, so pick the one that matches the screen.

## Choose between onSuccess and onPress

The built-in flow fits when you want the credential and handle the rest yourself. It stops fitting when you use an adapter such as `signInWithSupabase`, `signInWithClerk`, or `signInWithFirebase`. An adapter calls `AppleAuth.signIn` itself, then exchanges the token with your provider. If you call an adapter from `onSuccess`, the person sees the Apple sheet twice.

::: warning Adapters belong in onPress
Pass the adapter call to `onPress` and never call it from `onSuccess`. With `onPress` set, the button leaves the sign-in to you, so it also stops tracking the busy state: use `disabled` while your call runs.
:::

```tsx [SignInWithSupabase.tsx]
import { createClient } from '@supabase/supabase-js'
import { AppleButton, isCancelledError, signInWithSupabase } from 'expo-apple-sign-in'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { Alert } from 'react-native'

const supabase = createClient('https://example.supabase.co', 'public-anon-key')

export function SignInWithSupabase(): ReactElement {
  const [isSigningIn, setIsSigningIn] = useState(false)

  async function handlePress(): Promise<void> {
    setIsSigningIn(true)
    try {
      await signInWithSupabase(supabase)
    } catch (error) {
      if (!isCancelledError(error)) {
        Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Unknown error')
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  return <AppleButton onPress={handlePress} disabled={isSigningIn} />
}
```

## Custom label and content

`label` changes only the text. Keep the official wording unless you have a reason to change it.

```tsx [CustomLabelButton.tsx]
import { AppleButton } from 'expo-apple-sign-in'
import type { ReactElement } from 'react'

export function CustomLabelButton(): ReactElement {
  return <AppleButton buttonStyle="whiteOutline" label="Join with Apple" />
}
```

`children` replaces the mark and the label completely. The button keeps its shape, press handling, and accessibility role, but it no longer shows its own spinner, and the accessibility label is still the one for `buttonType` unless you set `label`. Use it for layouts the props cannot express. When the appearance is far from the default, a custom control built on the [useAppleAuth hook](/guides/hook) gives you more control.

```tsx [CustomContentButton.tsx]
import { AppleButton, AppleLogo } from 'expo-apple-sign-in'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'

export function CustomContentButton(): ReactElement {
  return (
    <AppleButton buttonStyle="white" label="Use my Apple ID">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <AppleLogo color="#000000" size={20} />
        <Text style={{ color: '#000000', fontWeight: '600' }}>Use my Apple ID</Text>
      </View>
    </AppleButton>
  )
}
```

## AppleLogo

`AppleLogo` renders the Apple mark on its own. It takes a required `color`, an optional `size` (default `18`), and an optional `style` for the image on native platforms. On web it draws an inline SVG, and on iOS and Android it draws a tinted image, so the mark is the same shape everywhere.

## What the defaults follow

The defaults come from the Human Interface Guidelines buttons for Sign in with Apple, and each point below maps to a value in the component:

- The three label strings are fixed per `buttonType` and match the official wording.
- The black, white, and white-with-outline palettes use pure black and white, with the mark and text in the opposite color.
- The mark is sized to 38% of the button height, and the label is set in semibold weight at 17 points, or 19 points when the height is 52 or more.
- The label stays on one line and the mark always sits to its left, with an 8-point gap.
- The corner radius is 8 and the height is 48 unless you change them.

Apple publishes the full rules in the [Sign in with Apple HIG](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple). Check them before you override the style, size, or label.
