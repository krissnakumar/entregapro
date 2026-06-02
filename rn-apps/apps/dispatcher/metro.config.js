// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Enable symlink support for pnpm
config.resolver.unstable_enableSymlinks = true;

// Watch all files within the workspace
config.watchFolders = [
  workspaceRoot,
  path.resolve(workspaceRoot, 'node_modules/.pnpm'),
];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Add custom resolver to handle monorepo duplicate React/React-Native versions and mock react-native-maps on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-maps' && platform === 'web') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(projectRoot, 'react-native-maps-mock.js'),
    };
  }
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName),
    };
  }
  if (moduleName === 'react' || moduleName === 'react-native') {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName),
    };
  }
  if (moduleName === '@tanstack/react-query' || moduleName.startsWith('@tanstack/react-query/')) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
