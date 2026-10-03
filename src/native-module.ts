import { requireOptionalNativeModule } from 'expo'

import type { TExpoAppleSignInNativeModule } from './types'

type TExpoModulesGlobal = {
  expo?: {
    modules?: Record<string, TExpoAppleSignInNativeModule | undefined>
  }
}

export function getNativeAppleModule(): TExpoAppleSignInNativeModule | null {
  const fromExpo = (globalThis as TExpoModulesGlobal).expo?.modules?.ExpoAppleSignIn
  if (fromExpo) {
    return fromExpo
  }

  return requireOptionalNativeModule<TExpoAppleSignInNativeModule>('ExpoAppleSignIn')
}
