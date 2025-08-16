/**
 * Jest configuration for Expo React Native project
 */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: [
    "<rootDir>/**/__tests__/**/*.(spec|test).[jt]s?(x)",
    "<rootDir>/**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@rn-primitives/.*)",
  ],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/$1",
  },
};
