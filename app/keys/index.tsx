import { useState, useEffect } from "react";
import { View, Pressable, Linking, Alert } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { useGlobalStore } from "~/hooks/useGlobalStore";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ChevronLeft } from "~/lib/icons/ChevronLeft";
import { X } from "~/lib/icons/X";

// Verify the Vercel AI Gateway API key by calling the models endpoint
async function verifyGatewayKey(apiKey: string): Promise<boolean> {
  try {
    const gateway = createGateway({
      apiKey,
      baseURL: "https://ai-gateway.vercel.sh/v1/ai",
    });
    const model = gateway("google/gemini-2.5-flash");
    const { text } = await generateText({
      model,
      prompt: "Ping",
    });
    return true;
  } catch (error) {
    return false;
  }
}

export default function Keys() {
  const insets = useSafeAreaInsets();
  const { setSelectedModel, apiKey, setApiKey } = useGlobalStore();
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Prefill input from stored key
  useEffect(() => {
    if (apiKey) setInput(apiKey);
  }, [apiKey]);

  function handleClearInput() {
    const emptySelectedModel = {
      label: undefined,
      value: undefined,
    };
    setSelectedModel(emptySelectedModel);
    setApiKey("");
    setInput("");
  }

  async function handleVerifyInput() {
    setIsLoading(true);
    const isValid = await verifyGatewayKey(input);
    // If the key is invalid, show an error alert
    if (!isValid) {
      Alert.alert("Error", "Invalid AI Gateway API key");
      setIsLoading(false);
      return;
    }

    // If the key is valid, set the API key and show a success alert
    setApiKey(input);
    Alert.alert("Success", "AI Gateway API Key verified successfully");
    setSelectedModel({
      label: "GPT-5",
      value: "openai/gpt-5",
    });
    setIsLoading(false);
  }

  return (
    <View className="flex-1 px-6" style={{ marginTop: insets.top + 4 }}>
      <View className="mb-8 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <ChevronLeft size={32} className="stroke-[1.5] text-foreground" />
        </Pressable>
        <Text className="text-center text-xl font-medium">AI Gateway</Text>
        <View className="w-[32px]"></View>
      </View>

      <View>
        <Text className="mb-2 text-xl font-semibold">AI Gateway API Key</Text>
        <Text className="mb-4 text-muted-foreground">
          Create an API key from Vercel AI Gateway {""}
          <Text
            className="font-medium text-foreground"
            onPress={() =>
              Linking.openURL("https://vercel.com/docs/ai-gateway")
            }
          >
            docs
          </Text>
          .
        </Text>

        <View className="relative">
          <Input
            placeholder={`Enter your API key`}
            className="rounded-2xl bg-muted-foreground/10 pl-3 pr-[36px]"
            value={input}
            onChangeText={setInput}
            multiline={false}
            secureTextEntry
          />
          {input.length ? (
            <Pressable
              onPress={handleClearInput}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="text-muted-foreground" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="mt-auto">
        <Button
          onPress={handleVerifyInput}
          disabled={!input.trim() || isLoading || !!apiKey}
          className="rounded-2xl text-background"
          style={{ marginBottom: insets.bottom + 4 }}
        >
          {apiKey ? (
            <Text>Verified</Text>
          ) : isLoading ? (
            <Text>Verifying...</Text>
          ) : (
            <Text>Verify</Text>
          )}
        </Button>
      </View>
    </View>
  );
}
