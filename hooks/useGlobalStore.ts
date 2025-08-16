import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

interface GlobalStore {
  // The current chat id to navigate to
  chatId: string;
  // The current selected model to chat with
  selectedModel: {
    label: string | undefined;
    value: string | undefined;
  };
  // The user's AI Gateway API key
  apiKey: string;
  // Actions
  setChatId: (chatId: string) => void;
  setSelectedModel: (selectedModel: {
    label: string | undefined;
    value: string | undefined;
  }) => void;
  setApiKey: (apiKey: string) => void;
}

export const useGlobalStore = create<GlobalStore>()(
  persist(
    (set) => ({
      chatId: "",
      selectedModel: {
        label: undefined,
        value: undefined,
      },
      apiKey: "",
      setChatId: (chatId) => set({ chatId }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      setApiKey: (apiKey) => set({ apiKey }),
    }),
    {
      name: "global-store",
      storage: createJSONStorage(() => ({
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
        removeItem: SecureStore.deleteItemAsync,
      })),
    },
  ),
);
