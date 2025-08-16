import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useGlobalStore } from "~/hooks/useGlobalStore";
import { useChatStore } from "~/hooks/useChatStore";

export default function Home() {
  const { chatId, setChatId } = useGlobalStore();
  const { chats, createChat } = useChatStore();

  // When app launches, it will be in the default route
  // If no chats exist, create a new chat and set it as the current chat in the global state
  // If chats exist, set the first chat as the current chat in the global state
  useEffect(() => {
    if (!chats.length) {
      const newChatId = createChat();
      setChatId(newChatId);
    } else {
      setChatId(chats[0].id);
    }
  }, [chats, createChat, setChatId]);

  // If no chats exist, redirect to the newly created chat
  if (!chats.length) return <Redirect href={`/chat/${chatId}`} />;

  // If chats exist, redirect to the first chat in the list
  return <Redirect href={`/chat/${chats[0].id}`} />;
}
