import { requireOptionalNativeModule } from 'expo'

import type { TExpoAppleSignInNativeModule } from './types'

type TExpoModulesGlobal = {
  expo?: {
    modules?: Record<string, TExpoAppleSignInNativeModule | undefined>
  }
}

/** Returns the `ExpoAppleSignIn` native module, or null when the binary lacks it, as on web. */
export function getNativeAppleModule(): TExpoAppleSignInNativeModule | null {
  const fromExpo = (globalThis as TExpoModulesGlobal).expo?.modules?.ExpoAppleSignIn
  if (fromExpo) {
    return fromExpo
  }

  return requireOptionalNativeModule<TExpoAppleSignInNativeModule>('ExpoAppleSignIn')
}
