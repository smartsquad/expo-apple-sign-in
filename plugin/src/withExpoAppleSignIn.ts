import { createRunOncePlugin, withEntitlementsPlist, withInfoPlist } from 'expo/config-plugins'
import type { ConfigPlugin } from 'expo/config-plugins'

const pkg: { name: string; version: string } = require('../../package.json')

const withAppleSignInEntitlement: ConfigPlugin = (config) => {
  return withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.applesignin'] = ['Default']

    return mod
  })
}

const withMixedLocalizations: ConfigPlugin = (config) => {
  return withInfoPlist(config, (mod) => {
    mod.modResults.CFBundleAllowMixedLocalizations =
      mod.modResults.CFBundleAllowMixedLocalizations ?? true

    return mod
  })
}

/**
 * Configures the iOS project for Sign in with Apple.
 *
 * Adds the `com.apple.developer.applesignin` entitlement with the `Default` value and sets
 * `CFBundleAllowMixedLocalizations` to `true` unless the app already defines it, so the system
 * Sign in with Apple sheet follows the device language.
 *
 * The plugin does not set `ios.usesAppleSignIn`. That key only feeds the fallback plugin that
 * `@expo/prebuild-config` registers for `expo-apple-authentication`, and that fallback warns when
 * the package is missing.
 *
 * The plugin takes no options. Android and web need no native config.
 */
const withExpoAppleSignIn: ConfigPlugin = (config) => {
  return withMixedLocalizations(withAppleSignInEntitlement(config))
}

export default createRunOncePlugin(withExpoAppleSignIn, pkg.name, pkg.version)
