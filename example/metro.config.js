const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')
const escape = (value) => value.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules'), path.resolve(projectRoot, 'node_modules/react-native/node_modules')]
config.resolver.disableHierarchicalLookup = true
config.resolver.unstable_enablePackageExports = true
config.resolver.extraNodeModules = {
  'expo-apple-sign-in': workspaceRoot,
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-web': path.resolve(projectRoot, 'node_modules/react-native-web'),
  'expo-modules-core': path.resolve(projectRoot, 'node_modules/expo-modules-core'),
  expo: path.resolve(projectRoot, 'node_modules/expo'),
}
config.resolver.blockList = [
  new RegExp(`${escape(workspaceRoot)}/node_modules/react/`),
  new RegExp(`${escape(workspaceRoot)}/node_modules/react-dom/`),
  new RegExp(`${escape(workspaceRoot)}/node_modules/react-native/`),
]

module.exports = config
