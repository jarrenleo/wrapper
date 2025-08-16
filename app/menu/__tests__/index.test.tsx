import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

// Icons → noop
jest.mock("~/lib/icons/Search", () => ({ Search: () => null }));
jest.mock("~/lib/icons/MessageCirclePlus", () => ({
  MessageCirclePlus: () => null,
}));
jest.mock("~/lib/icons/Trash2", () => ({ Trash2: () => null }));

// Safe area
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Gesture handler: render right actions always for test visibility
jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  return {
    Swipeable: ({ children, renderRightActions }: any) => (
      <>
        {renderRightActions
          ? renderRightActions({
              interpolate: ({ outputRange }: any) => outputRange[1],
            })
          : null}
        {children}
      </>
    ),
  };
});

// Router
jest.mock("expo-router", () => {
  const router = { replace: jest.fn() };
  return {
    useRouter: () => router,
    __router: router,
  };
});

// Stores
jest.mock("~/hooks/useGlobalStore", () => ({ useGlobalStore: jest.fn() }));
jest.mock("~/hooks/useChatStore", () => ({ useChatStore: jest.fn() }));

// SUT after mocks
import Menu from "../index";

const { useGlobalStore } = jest.requireMock("~/hooks/useGlobalStore");
const { useChatStore } = jest.requireMock("~/hooks/useChatStore");
const router = jest.requireMock("expo-router").__router;

type Chat = { id: string; title: string; description: string; messages: any[] };

describe("Menu screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default getState to avoid undefined access in component
    (useChatStore as any).getState = jest.fn(() => ({ chats: [] }));
  });

  it("Start new chat button (empty state) creates and navigates to new chat", async () => {
    const createChat = jest.fn().mockReturnValue("new-1");
    const setChatId = jest.fn();

    (useGlobalStore as jest.Mock).mockReturnValue({ chatId: "", setChatId });
    (useChatStore as jest.Mock).mockReturnValue({
      chats: [],
      loadChat: jest.fn(),
      createChat,
      deleteChat: jest.fn(),
    });

    const { getByText } = render(<Menu />);

    fireEvent.press(getByText("Start new chat"));

    await waitFor(() => {
      expect(createChat).toHaveBeenCalled();
      expect(setChatId).toHaveBeenCalledWith("new-1");
      expect(router.replace).toHaveBeenCalledWith("/chat/new-1");
    });
  });

  it("New chat button navigates to current empty chat without creating", () => {
    const setChatId = jest.fn();
    const loadChat = jest.fn().mockReturnValue({ messages: [] });

    (useGlobalStore as jest.Mock).mockReturnValue({ chatId: "c1", setChatId });
    (useChatStore as jest.Mock).mockReturnValue({
      chats: [{ id: "c1", title: "New Chat", description: "", messages: [] }],
      loadChat,
      createChat: jest.fn(),
      deleteChat: jest.fn(),
    });

    const { getByText } = render(<Menu />);
    fireEvent.press(getByText("New chat"));

    expect(loadChat).toHaveBeenCalledWith("c1");
    expect(router.replace).toHaveBeenCalledWith("/chat/c1");
  });

  it("New chat button creates and navigates when current chat has messages", async () => {
    const setChatId = jest.fn();
    const createChat = jest.fn().mockReturnValue("c2");
    const loadChat = jest.fn().mockReturnValue({ messages: [{ id: "m" }] });

    (useGlobalStore as jest.Mock).mockReturnValue({ chatId: "c1", setChatId });
    (useChatStore as jest.Mock).mockReturnValue({
      chats: [
        { id: "c1", title: "Chat 1", description: "", messages: [{ id: "m" }] },
      ],
      loadChat,
      createChat,
      deleteChat: jest.fn(),
    });

    const { getByText } = render(<Menu />);
    fireEvent.press(getByText("New chat"));

    await waitFor(() => {
      expect(createChat).toHaveBeenCalled();
      expect(setChatId).toHaveBeenCalledWith("c2");
      expect(router.replace).toHaveBeenCalledWith("/chat/c2");
    });
  });

  it("Selecting a different chat deletes an empty chat, sets and navigates to selected", () => {
    const setChatId = jest.fn();
    const deleteChat = jest.fn();
    const chats: Chat[] = [
      { id: "empty", title: "Empty", description: "", messages: [] },
      { id: "full", title: "Full", description: "", messages: [{ id: "1" }] },
    ];

    (useGlobalStore as jest.Mock).mockReturnValue({
      chatId: "empty",
      setChatId,
    });
    (useChatStore as jest.Mock).mockReturnValue({
      chats,
      loadChat: jest.fn(),
      createChat: jest.fn(),
      deleteChat,
    });

    const { getByText } = render(<Menu />);

    fireEvent.press(getByText("Full"));

    expect(deleteChat).toHaveBeenCalledWith("empty");
    expect(setChatId).toHaveBeenCalledWith("full");
    expect(router.replace).toHaveBeenCalledWith("/chat/full");
  });

  it("Delete does nothing for chats without messages", () => {
    const deleteChat = jest.fn();
    (useGlobalStore as jest.Mock).mockReturnValue({
      chatId: "c1",
      setChatId: jest.fn(),
    });
    (useChatStore as jest.Mock).mockReturnValue({
      chats: [{ id: "c1", title: "Empty", description: "", messages: [] }],
      loadChat: jest.fn(),
      createChat: jest.fn(),
      deleteChat,
    });

    const { getByText } = render(<Menu />);

    // Right action Delete is rendered by our Swipeable mock
    fireEvent.press(getByText("Delete"));

    expect(deleteChat).not.toHaveBeenCalled();
  });

  it("Delete last chat creates a new one and navigates to it", async () => {
    const setChatId = jest.fn();
    const deleteChat = jest.fn().mockImplementation(() => {
      (useChatStore as any).getState = jest.fn(() => ({ chats: [] }));
    });
    const createChat = jest.fn().mockReturnValue("new-after-delete");

    (useGlobalStore as jest.Mock).mockReturnValue({ chatId: "c1", setChatId });
    (useChatStore as jest.Mock).mockReturnValue({
      chats: [
        { id: "c1", title: "Full", description: "", messages: [{ id: "1" }] },
      ],
      loadChat: jest.fn(),
      createChat,
      deleteChat,
    });

    const { getAllByText } = render(<Menu />);
    // The first Delete corresponds to the first chat in the list (c1)
    fireEvent.press(getAllByText("Delete")[0]);

    await waitFor(() => {
      expect(createChat).toHaveBeenCalled();
      expect(setChatId).toHaveBeenCalledWith("new-after-delete");
      expect(router.replace).toHaveBeenCalledWith("/chat/new-after-delete");
    });
  });

  it("Deleting current chat sets first remaining chat as current without navigation", () => {
    const setChatId = jest.fn();
    const remaining: Chat[] = [
      { id: "c2", title: "Next", description: "", messages: [{ id: "x" }] },
    ];
    const deleteChat = jest.fn().mockImplementation(() => {
      (useChatStore as any).getState = jest.fn(() => ({ chats: remaining }));
    });

    (useGlobalStore as jest.Mock).mockReturnValue({ chatId: "c1", setChatId });
    (useChatStore as jest.Mock).mockReturnValue({
      chats: [
        {
          id: "c1",
          title: "To Delete",
          description: "",
          messages: [{ id: "1" }],
        },
        ...remaining,
      ],
      loadChat: jest.fn(),
      createChat: jest.fn(),
      deleteChat,
    });

    const { getAllByText } = render(<Menu />);
    // First Delete corresponds to the first list item (c1)
    fireEvent.press(getAllByText("Delete")[0]);

    expect(setChatId).toHaveBeenCalledWith("c2");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("filters chats by search query (case-insensitive) and shows 'No chats found' when none match", () => {
    (useGlobalStore as jest.Mock).mockReturnValue({
      chatId: "c1",
      setChatId: jest.fn(),
    });
    (useChatStore as jest.Mock).mockReturnValue({
      chats: [
        { id: "c1", title: "Hello", description: "", messages: [] },
        { id: "c2", title: "World", description: "", messages: [] },
      ],
      loadChat: jest.fn(),
      createChat: jest.fn(),
      deleteChat: jest.fn(),
    });

    const { getByPlaceholderText, queryByText, getByText } = render(<Menu />);

    // filter to single chat
    const search = getByPlaceholderText("Search");
    fireEvent.changeText(search, "wor");
    expect(queryByText("Hello")).toBeNull();
    expect(getByText("World")).toBeTruthy();

    // filter to none
    fireEvent.changeText(search, "zzz");
    expect(getByText("No chats found")).toBeTruthy();
  });
});
