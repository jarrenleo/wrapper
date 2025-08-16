import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId, UIMessage } from "ai";

export interface Chat {
  id: string;
  title: string;
  description: string;
  messages: UIMessage[];
}

interface ChatStore {
  // The list of chats
  chats: Chat[];
  // Actions
  loadChat: (id: string) => Chat | undefined;
  createChat: () => string;
  updateChatTitle: (id: string, title: string) => void;
  updateChatDescription: (id: string, description: string) => void;
  deleteChat: (id: string) => void;
  addMessage: (id: string, message: UIMessage) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      loadChat: (id: string) => {
        return get().chats.find((chat) => chat.id === id);
      },
      createChat: () => {
        const id = generateId();
        const newChat: Chat = {
          id,
          title: "",
          description: "",
          messages: [],
        };
        set((state) => ({ chats: [newChat, ...state.chats] }));

        return id;
      },
      updateChatTitle: (id: string, title: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id ? { ...chat, title } : chat,
          ),
        }));
      },
      updateChatDescription: (id: string, description: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id ? { ...chat, description } : chat,
          ),
        }));
      },
      deleteChat: (id: string) => {
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== id),
        }));
      },
      addMessage: (id: string, message: UIMessage) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id
              ? { ...chat, messages: [...chat.messages, message] }
              : chat,
          ),
        }));
      },
    }),
    {
      name: "chat-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
