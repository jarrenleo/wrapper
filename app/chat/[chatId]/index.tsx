import { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { fetch as expoFetch } from "expo/fetch";
import { DefaultChatTransport, generateId } from "ai";
import { useGlobalStore } from "~/hooks/useGlobalStore";
import { useChatStore } from "~/hooks/useChatStore";
import { useChat } from "@ai-sdk/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ModelSheet from "~/components/ModelSheet";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import WaveformSpinner from "~/components/WaveformSpinner";
import { generateAPIUrl } from "~/lib/utils";
import { KeyRound } from "~/lib/icons/KeyRound";
import { Menu } from "~/lib/icons/Menu";
import { ArrowUp } from "~/lib/icons/ArrowUp";

export default function Chat() {
  const insets = useSafeAreaInsets();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { apiKey } = useGlobalStore();
  const { loadChat, addMessage, updateChatTitle, updateChatDescription } =
    useChatStore();
  const [inputText, setInputText] = useState<string>("");
  const scrollViewRef = useRef<ScrollView>(null);
  // Smooth auto-scroll helpers
  const isNearBottomRef = useRef(true);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const initialMessages = loadChat(chatId)?.messages ?? [];
  // AI sdk hook that enables the streaming of chat messages from AI providers, manages the chat state, and updates the UI automatically as new messages are received
  const { status, messages, sendMessage } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl("/api/chat"),
      // Request body sent to the api
      prepareSendMessagesRequest({ messages }) {
        const { selectedModel, apiKey } = useGlobalStore.getState();

        return {
          body: {
            messages,
            selectedModel,
            apiKey,
          },
        };
      },
    }),
    onFinish({ message }) {
      // Add the ai provider message to the chat store
      addMessage(chatId, message);

      const chat = loadChat(chatId);
      if (!chat?.description)
        updateChatDescription(chatId, message.parts.at(-1)?.text || "");
    },
  });

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 80; // px threshold considered "near bottom"
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;
    isNearBottomRef.current = isNearBottom;
  }

  function handleContentSizeChange() {
    if (!scrollViewRef.current || !isNearBottomRef.current) return;
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);

    rafIdRef.current = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
      rafIdRef.current = null;
    });
  }

  function handleSubmit() {
    // Ensure API key and user inputs are present
    if (!apiKey) return;
    if (!inputText.trim()) return;

    // Send message to the api
    sendMessage({ text: inputText });

    // Add user message to the chat store
    const id = generateId();
    const newMessage = {
      id,
      metadata: undefined,
      parts: [
        { type: "step-start" as const },
        {
          providerMetadata: undefined,
          state: "done" as const,
          text: inputText,
          type: "text" as const,
        },
      ],
      role: "user" as const,
    };
    addMessage(chatId, newMessage);

    // Update chat title if it is a new chat
    const chat = loadChat(chatId);
    if (!chat?.title) updateChatTitle(chatId, inputText);

    // Clear input
    setInputText("");
  }

  return (
    <BottomSheetModalProvider>
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          className="mb-4 flex-row items-center justify-between bg-background px-6"
          style={{ marginTop: insets.top + 4 }}
        >
          {/* Menu Screen (disabled while streaming) */}
          <Link href="/menu" asChild>
            <Pressable
              disabled={status !== "ready"}
              accessibilityState={{ disabled: status !== "ready" }}
            >
              <Menu
                size={24}
                className={`text-foreground ${status !== "ready" ? "opacity-40" : ""}`}
              />
            </Pressable>
          </Link>

          {/* Model Select */}
          <ModelSheet />

          {/* API Key Screen (disabled while streaming) */}
          <Link href="/keys" asChild>
            <Pressable
              disabled={status !== "ready"}
              accessibilityState={{ disabled: status !== "ready" }}
            >
              <KeyRound
                size={24}
                className={`text-foreground ${status !== "ready" ? "opacity-40" : ""}`}
              />
            </Pressable>
          </Link>
        </View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={16}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-end",
          }}
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => (
            <View
              key={m.id}
              className={`mb-4 flex-row ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <View
                className={`rounded-2xl py-3 ${
                  m.role === "user" && "ml-4 max-w-[100%] bg-muted px-4"
                }`}
              >
                <Text className="text-lg text-foreground">
                  {m.parts
                    .filter((part) => part.type === "text")
                    .map((part) => (part as any).text)
                    .join("")}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Text Input */}
        <View
          className="mt-4 max-h-[300px] flex-row items-center gap-4 px-6"
          style={{ marginBottom: insets.bottom + 4 }}
        >
          <View className="flex-1 rounded-2xl bg-muted px-6 pb-4 pt-2">
            <TextInput
              className="text-lg text-foreground"
              placeholder="Ask anything"
              value={inputText}
              onChange={(e) => setInputText(e.nativeEvent.text)}
              multiline
              onSubmitEditing={handleSubmit}
              autoFocus={true}
            />
          </View>
          <Button
            onPress={handleSubmit}
            disabled={!inputText.trim() || !apiKey}
            className="self-end rounded-full bg-foreground"
            style={{ width: 52, height: 52 }}
          >
            {status === "ready" ? (
              <ArrowUp className="text-background" />
            ) : (
              <WaveformSpinner size={24} stroke={3.5} speed={1} />
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </BottomSheetModalProvider>
  );
}
