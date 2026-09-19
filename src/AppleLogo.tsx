import { createElement, type ReactElement } from 'react'
import { Image, Platform, type ImageStyle, type StyleProp } from 'react-native'

import { APPLE_MARK_PATH, APPLE_MARK_PNG_DATA_URI, APPLE_MARK_VIEW_BOX } from './appleMark'

interface IAppleLogoProps {
  color: string
  size?: number
  style?: StyleProp<ImageStyle>
}

export function AppleLogo({ color, size = 18, style }: IAppleLogoProps): ReactElement {
  if (Platform.OS === 'web') {
    return createElement(
      'svg',
      {
        viewBox: APPLE_MARK_VIEW_BOX,
        width: size,
        height: size,
        'aria-hidden': true,
        focusable: false,
        style: { width: size, height: size, display: 'block', flexShrink: 0 },
      },
      createElement('path', { d: APPLE_MARK_PATH, fill: color })
    ) as ReactElement
  }

  return (
    <Image
      accessibilityElementsHidden
      resizeMode="contain"
      source={{ uri: APPLE_MARK_PNG_DATA_URI }}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
    />
  )
}
