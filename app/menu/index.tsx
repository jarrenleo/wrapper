import { useState } from "react";
import { View, ScrollView, Pressable, TextInput, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useGlobalStore } from "~/hooks/useGlobalStore";
import { useChatStore, Chat } from "~/hooks/useChatStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { Text } from "~/components/ui/text";
import { Search } from "~/lib/icons/Search";
import { MessageCirclePlus } from "~/lib/icons/MessageCirclePlus";
import { Trash2 } from "~/lib/icons/Trash2";

export default function Menu() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { chatId, setChatId } = useGlobalStore();
  const { chats, loadChat, createChat, deleteChat } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");

  function handleCreateChat() {
    // Only create a new chat if the current chat has messages
    // If the current chat has no messages (it is a new chat), navigate to it
    if (chats.length) {
      const chat = loadChat(chatId);
      if (!chat?.messages.length) {
        router.replace(`/chat/${chatId}`);
        return;
      }
    }

    // Else, create a new chat and navigate to it
    const newChatId = createChat();
    setChatId(newChatId);
    router.replace(`/chat/${newChatId}`);
  }

  function handleSelectChat(chat: Chat) {
    // If the user creates a new chat and then proceeds to click on another existing chat
    // Delete the empty chat that was preivously created
    if (chat.id !== chatId) {
      const emptyChat = chats.find((c) => !c.messages.length);
      if (emptyChat) deleteChat(emptyChat.id);
    }

    // Then, navigate to the selected chat
    setChatId(chat.id);
    router.replace(`/chat/${chat.id}`);
  }

  function handleDeleteChat(chat: Chat) {
    // Only delete the chat if it has messages
    if (!chat.messages.length) return;

    deleteChat(chat.id);

    // Read the latest state AFTER deletion
    const nextChats = useChatStore.getState().chats;

    // If there are no more chats left, create a new one and navigate to it
    if (!nextChats.length) {
      const newChatId = createChat();
      setChatId(newChatId);
      router.replace(`/chat/${newChatId}`);
      return;
    }

    // If the deleted chat is the current chat, set the first remaining chat as the current chat and navigate to it
    if (chat.id === chatId) setChatId(nextChats[0].id);
  }

  let displayChats = chats;
  // If there are chats and a search query, filter the chats
  if (chats.length && searchQuery)
    displayChats = chats.filter((chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  return (
    <View
      className="flex-1 bg-background"
      style={{ marginTop: insets.top + 4 }}
    >
      <View className="relative mb-4 px-6">
        <Search className="absolute left-9 z-10 stroke-muted-foreground pt-[48px]" />
        <TextInput
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="rounded-2xl bg-muted pb-4 pl-[44px] pr-4 pt-3 text-lg text-foreground"
        />
      </View>

      {/* Chat List */}
      <ScrollView className="flex-1">
        {!displayChats.length && !searchQuery ? (
          <View className="mt-8 flex-1 flex-col items-center justify-center">
            <Text className="text-center text-lg text-muted-foreground">
              Start a new chat or revisit past
            </Text>
            <Text className="mb-6 text-center text-lg text-muted-foreground">
              conversations here.
            </Text>
            <Pressable
              onPress={handleCreateChat}
              className="rounded-full bg-foreground px-4 py-3 text-background"
            >
              <Text className="font-medium text-background">
                Start new chat
              </Text>
            </Pressable>
          </View>
        ) : !displayChats.length ? (
          <View>
            <Text className="text-center text-lg text-muted-foreground">
              No chats found
            </Text>
          </View>
        ) : (
          displayChats.map((chat) => (
            <Swipeable
              key={chat.id}
              overshootRight={false}
              friction={2}
              rightThreshold={40}
              renderRightActions={(progress) => {
                const translateX = progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [88, 0],
                  extrapolate: "clamp",
                });
                const scale = progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                  extrapolate: "clamp",
                });
                const opacity = progress.interpolate({
                  inputRange: [0.2, 1],
                  outputRange: [0, 1],
                  extrapolate: "clamp",
                });

                return (
                  <Animated.View
                    style={{
                      width: 72,
                      transform: [{ translateX }],
                    }}
                    className="bg-destructive"
                  >
                    <Pressable
                      onPress={() => handleDeleteChat(chat)}
                      style={{
                        width: "100%",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Animated.View
                        style={{ transform: [{ scale }], opacity }}
                        className="flex-col items-center gap-2"
                      >
                        <Trash2 className="stroke-foreground" />
                        <Text className="text-lg font-medium text-foreground">
                          Delete
                        </Text>
                      </Animated.View>
                    </Pressable>
                  </Animated.View>
                );
              }}
            >
              <Pressable
                onPress={() => handleSelectChat(chat)}
                className="flex-col items-start justify-between gap-4 p-6 active:bg-muted"
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="text-lg font-medium text-foreground"
                >
                  {!chat.title ? "New Chat" : chat.title}
                </Text>
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  className="text-lg text-muted-foreground"
                >
                  {!chat.description ? "..." : chat.description}
                </Text>
              </Pressable>
            </Swipeable>
          ))
        )}
      </ScrollView>

      <View
        className="mt-4 flex-row items-center justify-end px-6"
        style={{ marginBottom: insets.bottom + 4 }}
      >
        <Pressable
          onPress={handleCreateChat}
          className="flex-row items-center justify-between gap-1.5 rounded-full bg-muted px-6 py-4"
        >
          <MessageCirclePlus
            size={28}
            className="fill-foreground stroke-muted"
          />
          <Text className="text-lg font-medium text-foreground">New chat</Text>
        </Pressable>
      </View>
    </View>
  );
}
