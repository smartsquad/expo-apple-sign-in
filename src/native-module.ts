import { requireOptionalNativeModule } from 'expo'

import type { TExpoAppleSignInNativeModule } from './types'

type TExpoV2Global = {
  expoV2?: {
    modules?: Record<string, TExpoAppleSignInNativeModule | undefined>
  }
}

export function getNativeAppleModule(): TExpoAppleSignInNativeModule | null {
  const fromV2 = (globalThis as TExpoV2Global).expoV2?.modules?.ExpoAppleSignIn
  if (fromV2) {
    return fromV2
  }

  return requireOptionalNativeModule<TExpoAppleSignInNativeModule>('ExpoAppleSignIn')
}
