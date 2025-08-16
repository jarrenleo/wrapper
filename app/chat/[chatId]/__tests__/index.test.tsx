import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Pressable } from "react-native";

// SUT
import Chat from "../index";

// Stores
jest.mock("~/hooks/useGlobalStore", () => ({ useGlobalStore: jest.fn() }));
jest.mock("~/hooks/useChatStore", () => ({ useChatStore: jest.fn() }));

// Router and params
jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useLocalSearchParams: () => ({ chatId: "chat-1" }),
}));

// Bottom sheet provider
jest.mock("@gorhom/bottom-sheet", () => ({
  BottomSheetModalProvider: ({ children }: any) => children,
}));

// Safe area
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Icons → noop/simple
jest.mock("~/lib/icons/Menu", () => ({ Menu: () => null }));
jest.mock("~/lib/icons/KeyRound", () => ({ KeyRound: () => null }));
jest.mock("~/lib/icons/ArrowUp", () => ({ ArrowUp: () => null }));

// Model selector → noop
jest.mock("~/components/ModelSheet", () => () => null);

// generateAPIUrl and cn → stable
jest.mock("~/lib/utils", () => ({
  generateAPIUrl: (p: string) => p,
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

// Spinner → noop (avoid RN usage in factory)
jest.mock("~/components/WaveformSpinner", () => () => null);

// AI SDK
let mockUseChatReturn: any;
jest.mock("@ai-sdk/react", () => {
  let lastArgs: any = null;
  return {
    useChat: jest.fn((args: any) => {
      lastArgs = args;
      return mockUseChatReturn;
    }),
    __getLastArgs: () => lastArgs,
  };
});

// 'ai' primitives used directly in component
jest.mock("ai", () => ({
  DefaultChatTransport: class {
    opts: any;
    constructor(opts: any) {
      this.opts = opts;
    }
  },
  generateId: () => "gen-user-1",
}));

// expo/fetch named export used during DefaultChatTransport creation
jest.mock("expo/fetch", () => ({ fetch: global.fetch }));
// expo-constants used by generateAPIUrl
jest.mock("expo-constants", () => ({ experienceUrl: "exp://127.0.0.1:8081" }));

const { useGlobalStore } = jest.requireMock("~/hooks/useGlobalStore");
const { useChatStore } = jest.requireMock("~/hooks/useChatStore");
const getLastUseChatArgs = () =>
  jest.requireMock("@ai-sdk/react").__getLastArgs();

describe("Chat screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChatReturn = {
      status: "ready",
      messages: [],
      sendMessage: jest.fn(),
    };
  });

  it("renders messages from useChat and passes initial messages from store to useChat", () => {
    const initialStoreMessages = [
      {
        id: "s1",
        role: "user",
        parts: [{ type: "text", text: "Hello from store" }],
      },
    ];

    const addMessage = jest.fn();
    const loadChat = jest.fn().mockReturnValue({
      messages: initialStoreMessages,
      title: "t",
      description: "d",
    });
    const updateChatTitle = jest.fn();
    const updateChatDescription = jest.fn();

    (useChatStore as jest.Mock).mockReturnValue({
      loadChat,
      addMessage,
      updateChatTitle,
      updateChatDescription,
    });
    (useGlobalStore as jest.Mock).mockReturnValue({ apiKey: "sk-xyz" });

    mockUseChatReturn.messages = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "Hello" }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "World" }] },
    ];

    const { getByText } = render(<Chat />);

    expect(getByText("Hello")).toBeTruthy();
    expect(getByText("World")).toBeTruthy();

    const args = getLastUseChatArgs();
    expect(args.id).toBe("chat-1");
    expect(args.messages).toEqual(initialStoreMessages);
  });

  it("submits user message via submitEditing and updates store, clearing input and setting title if missing", async () => {
    const loadChat = jest
      .fn()
      .mockImplementation((id: string) =>
        id ? { messages: [], title: undefined } : null,
      );
    const addMessage = jest.fn();
    const updateChatTitle = jest.fn();
    const updateChatDescription = jest.fn();

    (useChatStore as jest.Mock).mockReturnValue({
      loadChat,
      addMessage,
      updateChatTitle,
      updateChatDescription,
    });
    (useGlobalStore as jest.Mock).mockReturnValue({ apiKey: "sk-xyz" });

    const sendMessage = jest.fn();
    mockUseChatReturn.sendMessage = sendMessage;
    mockUseChatReturn.status = "ready";

    const { getByPlaceholderText } = render(<Chat />);

    // Type text
    const input = getByPlaceholderText("Ask anything");
    fireEvent(input, "change", { nativeEvent: { text: "Hi there" } });

    // Submit via TextInput onSubmitEditing
    fireEvent(input, "submitEditing");

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({ text: "Hi there" });
      expect(addMessage).toHaveBeenCalledTimes(1);
      expect(updateChatTitle).toHaveBeenCalledWith("chat-1", "Hi there");
    });

    // Input should be cleared
    expect((input as any).props.value ?? "").toBe("");
  });

  it("disables header actions when status is not 'ready'", () => {
    const loadChat = jest.fn().mockReturnValue({ messages: [] });
    (useChatStore as jest.Mock).mockReturnValue({
      loadChat,
      addMessage: jest.fn(),
      updateChatTitle: jest.fn(),
      updateChatDescription: jest.fn(),
    });
    (useGlobalStore as jest.Mock).mockReturnValue({ apiKey: "sk-xyz" });

    mockUseChatReturn.status = "streaming";

    const { UNSAFE_getAllByType } = render(<Chat />);

    // Two header actions wrapped in Pressable are present and should be disabled
    const pressables = UNSAFE_getAllByType(require("react-native").Pressable);
    // Check their props to include disabled state via accessibilityState
    const disabledCount = pressables.filter(
      (n: any) => n.props.accessibilityState?.disabled,
    ).length;
    expect(disabledCount).toBeGreaterThanOrEqual(2);

    // No spinner assertion to avoid RN dependency in mock
  });

  it("handles onFinish: adds AI message and sets description when missing", async () => {
    const chatState = { messages: [], description: undefined } as any;
    const loadChat = jest.fn().mockReturnValue(chatState);
    const addMessage = jest.fn();
    const updateChatDescription = jest.fn();

    (useChatStore as jest.Mock).mockReturnValue({
      loadChat,
      addMessage,
      updateChatTitle: jest.fn(),
      updateChatDescription,
    });
    (useGlobalStore as jest.Mock).mockReturnValue({ apiKey: "sk-xyz" });

    render(<Chat />);

    const args = getLastUseChatArgs();
    const aiMessage = {
      id: "ai-1",
      role: "assistant",
      parts: [{ type: "text", text: "Summarized result" }],
    };
    args.onFinish({ message: aiMessage });

    await waitFor(() => {
      expect(addMessage).toHaveBeenCalledWith("chat-1", aiMessage);
      expect(updateChatDescription).toHaveBeenCalledWith(
        "chat-1",
        "Summarized result",
      );
    });
  });

  it("does not overwrite description on onFinish when description exists", async () => {
    const loadChat = jest
      .fn()
      .mockReturnValue({ messages: [], description: "existing" });
    const addMessage = jest.fn();
    const updateChatDescription = jest.fn();

    (useChatStore as jest.Mock).mockReturnValue({
      loadChat,
      addMessage,
      updateChatTitle: jest.fn(),
      updateChatDescription,
    });
    (useGlobalStore as jest.Mock).mockReturnValue({ apiKey: "sk-xyz" });

    render(<Chat />);

    const args = getLastUseChatArgs();
    args.onFinish({
      message: {
        id: "ai-2",
        role: "assistant",
        parts: [{ type: "text", text: "ignored" }],
      },
    });

    await waitFor(() => {
      expect(addMessage).toHaveBeenCalled();
      expect(updateChatDescription).not.toHaveBeenCalled();
    });
  });

  it("disables send when apiKey is missing and ignores press", async () => {
    const loadChat = jest.fn().mockReturnValue({ messages: [] });
    const addMessage = jest.fn();
    (useChatStore as jest.Mock).mockReturnValue({
      loadChat,
      addMessage,
      updateChatTitle: jest.fn(),
      updateChatDescription: jest.fn(),
    });

    (useGlobalStore as jest.Mock).mockReturnValue({ apiKey: "" });

    const sendMessage = jest.fn();
    mockUseChatReturn.sendMessage = sendMessage;
    mockUseChatReturn.status = "ready";

    const { getByPlaceholderText, UNSAFE_getAllByType } = render(<Chat />);

    const input = getByPlaceholderText("Ask anything");
    fireEvent(input, "change", { nativeEvent: { text: "Hello" } });

    const pressables = UNSAFE_getAllByType(Pressable);
    const sendBtn = pressables.find(
      (n: any) => n.props.style && n.props.style.width === 52,
    ) as any;
    expect(sendBtn).toBeTruthy();
    expect(sendBtn.props.disabled).toBe(true);

    fireEvent.press(sendBtn);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(addMessage).not.toHaveBeenCalled();
  });

  it("disables send when input is empty/whitespace and ignores press", async () => {
    const loadChat = jest.fn().mockReturnValue({ messages: [] });
    const addMessage = jest.fn();
    (useChatStore as jest.Mock).mockReturnValue({
      loadChat,
      addMessage,
      updateChatTitle: jest.fn(),
      updateChatDescription: jest.fn(),
    });

    (useGlobalStore as jest.Mock).mockReturnValue({ apiKey: "sk-xyz" });

    const sendMessage = jest.fn();
    mockUseChatReturn.sendMessage = sendMessage;
    mockUseChatReturn.status = "ready";

    const { getByPlaceholderText, UNSAFE_getAllByType } = render(<Chat />);

    const input = getByPlaceholderText("Ask anything");
    fireEvent(input, "change", { nativeEvent: { text: "   " } });

    const pressables = UNSAFE_getAllByType(Pressable);
    const sendBtn = pressables.find(
      (n: any) => n.props.style && n.props.style.width === 52,
    ) as any;
    expect(sendBtn).toBeTruthy();
    expect(sendBtn.props.disabled).toBe(true);

    fireEvent.press(sendBtn);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(addMessage).not.toHaveBeenCalled();
  });
});
