import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'

import { AppleAuth, claimWebRedirectReplay } from './AppleAuth'
import { AppleLogo } from './AppleLogo'
import { isCancelledError, normalizeAppleError, type AppleAuthError } from './errors'
import type { TAppleButtonStyle, TAppleButtonType, TAppleCredential } from './types'

/**
 * Props for {@link AppleButton}. Other `Pressable` props, such as `testID`, pass through to the
 * underlying `Pressable`. `accessibilityLabel` defaults to the visible label.
 */
export interface IAppleButtonProps extends Omit<
  PressableProps,
  'onPress' | 'style' | 'disabled' | 'children'
> {
  /** Custom press handler. When set, the button does not call `AppleAuth.signIn()`. */
  onPress?: () => void
  /** Called with the credential after a successful sign-in. */
  onSuccess?: (credential: TAppleCredential) => void
  /** Called with the normalized error when sign-in fails. Not called on cancel. */
  onError?: (error: AppleAuthError) => void
  /** Called when the user cancels sign-in. */
  onCancel?: () => void
  /** Button colors. Default: `'black'`. */
  buttonStyle?: TAppleButtonStyle
  /** Selects the HIG label. Default: `'signIn'`. */
  buttonType?: TAppleButtonType
  /** Overrides the HIG label derived from `buttonType`. */
  label?: string
  /** Default: `8`. */
  cornerRadius?: number
  /** Default: {@link APPLE_BUTTON_HEIGHT}. */
  height?: number
  /** Default: `'100%'`. */
  width?: number | `${number}%`
  /** Disables and dims the button. Default: `false`. */
  disabled?: boolean
  /** Applied after the built-in button styles. */
  style?: StyleProp<ViewStyle>
  /** Applied after the built-in label styles. */
  textStyle?: StyleProp<TextStyle>
  /**
   * Fully custom content. The official mark + label are skipped.
   * Use this, or `useAppleAuth`, when the default HIG button is not what you want.
   */
  children?: ReactNode
}

/** Alias of {@link IAppleButtonProps}. */
export type AppleButtonProps = IAppleButtonProps

const ELabels: Record<TAppleButtonType, string> = {
  signIn: 'Sign in with Apple',
  continue: 'Continue with Apple',
  signUp: 'Sign up with Apple',
}

/** Default {@link AppleButton} height. */
export const APPLE_BUTTON_HEIGHT = 48

/**
 * Sign in with Apple button with the HIG labels and colors on iOS, Android, and web. Pressing it
 * runs `AppleAuth.signIn()`, shows a spinner while it runs, and reports the outcome through
 * `onSuccess`, `onCancel`, or `onError`. Passing `onPress` replaces the built-in sign-in. After a
 * web redirect returns to the page, the button runs its handler again on mount, so `onSuccess`
 * fires, or `onPress` (and an adapter inside it) receives Apple's result.
 */
export function AppleButton({
  onPress,
  onSuccess,
  onError,
  onCancel,
  buttonStyle = 'black',
  buttonType = 'signIn',
  label,
  cornerRadius = 8,
  height = APPLE_BUTTON_HEIGHT,
  width = '100%',
  disabled = false,
  style,
  textStyle,
  children,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}: IAppleButtonProps) {
  const [busy, setBusy] = useState(false)
  const palette = useMemo(() => paletteFor(buttonStyle), [buttonStyle])
  const title = label ?? ELabels[buttonType]

  const runSignIn = useCallback(async () => {
    if (onPress) {
      onPress()
      return
    }
    setBusy(true)
    try {
      const credential = await AppleAuth.signIn()
      onSuccess?.(credential)
    } catch (error) {
      const normalized = normalizeAppleError(error)
      if (isCancelledError(normalized)) {
        onCancel?.()
        return
      }
      onError?.(normalized)
    } finally {
      setBusy(false)
    }
  }, [onCancel, onError, onPress, onSuccess])

  const runSignInRef = useRef(runSignIn)

  useEffect(() => {
    runSignInRef.current = runSignIn
  })

  useEffect(() => {
    if (Platform.OS === 'web' && claimWebRedirectReplay()) {
      runSignInRef.current()
    }
  }, [])

  const handlePress = useCallback(async () => {
    if (disabled || busy) {
      return
    }
    await runSignIn()
  }, [busy, disabled, runSignIn])

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          width,
          borderRadius: cornerRadius,
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderWidth: palette.borderWidth,
          opacity: disabled ? 0.5 : pressed ? 0.86 : 1,
        },
        style,
      ]}>
      {children ? (
        children
      ) : (
        <View style={styles.row}>
          {busy ? (
            <ActivityIndicator color={palette.foreground} size="small" />
          ) : (
            <AppleLogo color={palette.foreground} size={Math.round(height * 0.38)} />
          )}
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: palette.foreground,
                fontSize: height >= 52 ? 19 : 17,
              },
              textStyle,
            ]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

function paletteFor(style: TAppleButtonStyle) {
  if (style === 'white') {
    return { background: '#ffffff', foreground: '#000000', border: '#000000', borderWidth: 0 }
  }
  if (style === 'whiteOutline') {
    return {
      background: '#ffffff',
      foreground: '#000000',
      border: '#000000',
      borderWidth: StyleSheet.hairlineWidth * 2,
    }
  }
  return { background: '#000000', foreground: '#ffffff', border: '#000000', borderWidth: 0 }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    paddingHorizontal: 16,
    ...Platform.select({
      web: { cursor: 'pointer', userSelect: 'none' } as ViewStyle,
      default: {},
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '600',
    letterSpacing: -0.2,
    ...Platform.select({
      web: { wordSpacing: 1 } as TextStyle,
      default: {},
    }),
  },
})
