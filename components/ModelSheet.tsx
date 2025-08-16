import { useCallback, useMemo, useRef } from "react";
import { Pressable, View } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import { useGlobalStore } from "~/hooks/useGlobalStore";
import { Text } from "~/components/ui/text";
import { useColorScheme } from "~/lib/useColorScheme";
import { ChevronDown } from "~/lib/icons/ChevronDown";
import { X } from "~/lib/icons/X";

interface Model {
  label: string;
  value: string;
}

// List of models to be displayed in the model sheet
const models: Model[] = [
  { label: "GPT-5 nano", value: "openai/gpt-5-nano" },
  { label: "GPT-5 mini", value: "openai/gpt-5-mini" },
  { label: "GPT-5", value: "openai/gpt-5" },
  {
    label: "Claude Sonnet 4",
    value: "anthropic/claude-4-sonnet",
  },
  {
    label: "Claude Opus 4.1",
    value: "anthropic/claude-4.1-opus",
  },
  { label: "Gemini 2.5 Flash", value: "google/gemini-2.5-flash" },
  { label: "Gemini 2.5 Pro", value: "google/gemini-2.5-pro" },
  { label: "Grok 4", value: "xai/grok-4" },
  { label: "Sonar Pro", value: "perplexity/sonar-pro" },
  { label: "Sonar Reasoning Pro", value: "perplexity/sonar-reasoning-pro" },
];

export default function ModelSheet() {
  const { isDarkColorScheme } = useColorScheme();
  const { selectedModel, setSelectedModel, apiKey } = useGlobalStore();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => [apiKey ? "75%" : "20%"], [apiKey]);

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleCloseModal = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  function handleSelectModel(model: (typeof models)[0]) {
    setSelectedModel(model);
    bottomSheetModalRef.current?.dismiss();
  }

  // Component that renders each model in the list
  const renderItem = useCallback(
    ({ item }: { item: (typeof models)[0] }) => {
      return (
        <Pressable
          onPress={() => apiKey && handleSelectModel(item)}
          className="rounded-lg px-6 py-4 active:bg-muted"
        >
          <Text
            className={`text-lg ${
              selectedModel.label === item.label && apiKey ? "font-bold" : ""
            }`}
          >
            {item.label}
          </Text>
        </Pressable>
      );
    },
    [selectedModel, apiKey],
  );

  return (
    <>
      <Pressable
        onPress={handlePresentModalPress}
        className="flex-row items-center gap-1"
      >
        <Text className="text-xl font-medium text-foreground">
          {!apiKey ? "No API Key" : selectedModel.label}
        </Text>
        <ChevronDown className="text-foreground" size={20} />
      </Pressable>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
        handleIndicatorStyle={{
          backgroundColor: isDarkColorScheme
            ? "hsl(223.8136 0% 64.471%)"
            : "hsl(223.8136 0% 32.3067%)",
        }}
        backgroundStyle={{
          backgroundColor: isDarkColorScheme
            ? "hsl(223.8136 0% 11.304%)"
            : "hsl(223.8136 0.0002% 96.0587%)",
        }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          <View className="flex-row items-center justify-between px-6 py-4">
            <View style={{ width: 24 }} />
            <Text className="text-xl font-bold text-foreground">Models</Text>
            <Pressable onPress={handleCloseModal}>
              <X size={24} className="text-foreground" />
            </Pressable>
          </View>
          {!apiKey ? (
            <View className="flex-1 items-center justify-center">
              <Text className="px-6 py-4 text-muted-foreground">
                Please add an API key to use models
              </Text>
            </View>
          ) : (
            <BottomSheetFlatList
              data={models}
              keyExtractor={(i) => i.value}
              renderItem={renderItem}
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
