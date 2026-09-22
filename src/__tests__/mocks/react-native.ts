export const Platform = {
  OS: 'ios' as string,
  select: <T>(spec: { ios?: T; android?: T; web?: T; default?: T }): T | undefined => {
    if (Platform.OS === 'ios') {
      return spec.ios ?? spec.default
    }
    if (Platform.OS === 'android') {
      return spec.android ?? spec.default
    }
    if (Platform.OS === 'web') {
      return spec.web ?? spec.default
    }

    return spec.default
  },
}

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  hairlineWidth: 1,
}

export const View = 'View'
export const Text = 'Text'
export const Pressable = 'Pressable'
export const Image = 'Image'
export const ActivityIndicator = 'ActivityIndicator'
