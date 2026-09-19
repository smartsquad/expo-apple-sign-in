import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'

import { AppleAuth } from './AppleAuth'
import { AppleLogo } from './AppleLogo'
import { isCancelledError, normalizeAppleError, type AppleAuthError } from './errors'
import type { TAppleButtonStyle, TAppleButtonType, TAppleCredential } from './types'

export interface IAppleButtonProps {
  /** Custom press handler. When set, the button does not call `AppleAuth.signIn()`. */
  onPress?: () => void
  onSuccess?: (credential: TAppleCredential) => void
  onError?: (error: AppleAuthError) => void
  onCancel?: () => void
  buttonStyle?: TAppleButtonStyle
  buttonType?: TAppleButtonType
  /** Overrides the HIG label derived from `buttonType`. */
  label?: string
  cornerRadius?: number
  height?: number
  width?: number | `${number}%`
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  /**
   * Fully custom content. The official mark + label are skipped.
   * Use this, or `useAppleAuth`, when the default HIG button is not what you want.
   */
  children?: ReactNode
}

export type AppleButtonProps = IAppleButtonProps

const ELabels: Record<TAppleButtonType, string> = {
  signIn: 'Sign in with Apple',
  continue: 'Continue with Apple',
  signUp: 'Sign up with Apple',
}

export const APPLE_BUTTON_HEIGHT = 48

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
}: IAppleButtonProps) {
  const [busy, setBusy] = useState(false)
  const palette = useMemo(() => paletteFor(buttonStyle), [buttonStyle])
  const title = label ?? ELabels[buttonType]

  const handlePress = useCallback(async () => {
    if (disabled || busy) {
      return
    }
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
  }, [busy, disabled, onCancel, onError, onPress, onSuccess])

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
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
