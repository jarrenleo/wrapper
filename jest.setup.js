// Global Jest setup for Expo React Native project

// Add jest-native matchers (optional for non-UI tests)
require("@testing-library/jest-native/extend-expect");

// Polyfill TransformStream for libraries that rely on Web Streams API in Node
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TransformStream } = require("stream/web");
  if (typeof global.TransformStream === "undefined") {
    // @ts-ignore
    global.TransformStream = TransformStream;
  }
} catch (e) {
  // ignore if not available
}

// Mock AsyncStorage with official mock implementation
jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock expo-secure-store with an in-memory implementation
jest.mock("expo-secure-store", () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => {
      return store.has(key) ? store.get(key) : null;
    }),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    __reset: () => store.clear(),
  };
});
