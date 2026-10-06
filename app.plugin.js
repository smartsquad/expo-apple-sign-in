const { createRequire } = require('module')

/**
 * The package lives outside the app workspace, so Node resolves requires from
 * this file and misses the app's node_modules. Load config plugins from the
 * Expo process that required this plugin.
 */
function loadConfigPlugins() {
  const starts = []
  if (module.parent?.filename) {
    starts.push(module.parent.filename)
  }
  if (require.main?.filename) {
    starts.push(require.main.filename)
  }
  for (const filename of starts) {
    try {
      return createRequire(filename)('@expo/config-plugins')
    } catch {
      // try the next caller
    }
  }
  return require('expo/config-plugins')
}

const { withEntitlementsPlist } = loadConfigPlugins()

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
