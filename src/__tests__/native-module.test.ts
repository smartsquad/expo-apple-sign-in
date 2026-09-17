import { requireOptionalNativeModule } from 'expo'

import { getNativeAppleModule } from '../native-module'
import type { TExpoAppleSignInNativeModule } from '../types'

const requireOptional = requireOptionalNativeModule as jest.MockedFunction<
  typeof requireOptionalNativeModule
>

const moduleStub: TExpoAppleSignInNativeModule = {
  isAvailable: () => true,
  signIn: jest.fn(),
  getCredentialState: jest.fn(),
}

afterEach(() => {
  delete (globalThis as { expoV2?: unknown }).expoV2
  requireOptional.mockReset()
  requireOptional.mockReturnValue(null)
})

describe('getNativeAppleModule', () => {
  it('prefers the Expo Modules 2.0 global', () => {
    ;(globalThis as { expoV2?: { modules?: { ExpoAppleSignIn?: TExpoAppleSignInNativeModule } } }).expoV2 =
      {
        modules: { ExpoAppleSignIn: moduleStub },
      }

    expect(getNativeAppleModule()).toBe(moduleStub)
    expect(requireOptional).not.toHaveBeenCalled()
  })

  it('falls back to requireOptionalNativeModule', () => {
    requireOptional.mockReturnValue(moduleStub)
    expect(getNativeAppleModule()).toBe(moduleStub)
    expect(requireOptional).toHaveBeenCalledWith('ExpoAppleSignIn')
  })

  it('returns null when neither binding exists', () => {
    requireOptional.mockReturnValue(null)
    expect(getNativeAppleModule()).toBeNull()
  })
})
