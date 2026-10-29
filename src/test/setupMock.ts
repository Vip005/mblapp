(globalThis as any).__DEV__ = true;

const inMemoryAsyncStorage = new Map<string, string>();
const inMemorySecureStore = new Map<string, string>();

const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'react-native') {
    return {
      Platform: { OS: 'android', select: (objs: any) => objs.android || objs.default },
      NativeModules: {},
      StyleSheet: {
        create: (styles: any) => styles,
        absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      },
    };
  }
  if (id === '@react-native-async-storage/async-storage') {
    return {
      getItem: async (key: string) => inMemoryAsyncStorage.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        inMemoryAsyncStorage.set(key, String(value));
      },
      removeItem: async (key: string) => {
        inMemoryAsyncStorage.delete(key);
      },
      multiRemove: async (keys: string[]) => {
        for (const k of keys) {
          inMemoryAsyncStorage.delete(k);
        }
      },
      clear: async () => {
        inMemoryAsyncStorage.clear();
      },
    };
  }
  if (id === 'expo-secure-store') {
    return {
      getItemAsync: async (key: string) => inMemorySecureStore.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        inMemorySecureStore.set(key, String(value));
      },
      deleteItemAsync: async (key: string) => {
        inMemorySecureStore.delete(key);
      },
    };
  }
  if (id === 'expo-clipboard') {
    let mockClipboardText = '';
    return {
      setStringAsync: async (str: string) => {
        mockClipboardText = str;
        return true;
      },
      getStringAsync: async () => mockClipboardText,
    };
  }
  return originalRequire.apply(this, [id, ...args]);
};
