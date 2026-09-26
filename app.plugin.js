const { withEntitlementsPlist } = require('expo/config-plugins')

/**
 * Enables the Sign in with Apple entitlement and capability.
 * Add `"expo-apple-sign-in"` to `plugins` in app.json. That is the whole iOS setup.
 */
function withExpoAppleSignIn(config) {
  config.ios = config.ios ?? {}
  config.ios.usesAppleSignIn = true

  return withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.applesignin'] = ['Default']
    return mod
  })
}

module.exports = withExpoAppleSignIn
