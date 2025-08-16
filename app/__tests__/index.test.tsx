import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import Home from "../index";

// Mocks
jest.mock("~/hooks/useGlobalStore", () => ({ useGlobalStore: jest.fn() }));
jest.mock("~/hooks/useChatStore", () => ({ useChatStore: jest.fn() }));

// Mock expo-router Redirect to capture href without requiring React elements
jest.mock("expo-router", () => {
  let lastHref: any = null;
  return {
    Redirect: ({ href }: { href: any }) => {
      lastHref = href;
      return null;
    },
    __getLastHref: () => lastHref,
  };
});

const { useGlobalStore } = jest.requireMock("~/hooks/useGlobalStore");
const { useChatStore } = jest.requireMock("~/hooks/useChatStore");
const getLastHref = () => jest.requireMock("expo-router").__getLastHref();

describe("Home (app/index)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a new chat and redirects to /chat/{newId} when there are no chats", async () => {
    const setChatId = jest.fn();
    const createChat = jest.fn().mockReturnValue("new-id");

    (useChatStore as jest.Mock).mockReturnValue({ chats: [], createChat });
    (useGlobalStore as jest.Mock).mockReturnValue({
      chatId: "new-id",
      setChatId,
    });

    render(<Home />);

    await waitFor(() => {
      expect(createChat).toHaveBeenCalledTimes(1);
      expect(setChatId).toHaveBeenCalledWith("new-id");
    });

    expect(getLastHref()).toBe("/chat/new-id");
  });

  it("uses the first existing chat and redirects to /chat/{firstId} when chats exist", async () => {
    const setChatId = jest.fn();
    const createChat = jest.fn();
    const chats = [{ id: "first-chat" }, { id: "second-chat" }];

    (useChatStore as jest.Mock).mockReturnValue({ chats, createChat });
    (useGlobalStore as jest.Mock).mockReturnValue({ chatId: null, setChatId });

    render(<Home />);

    await waitFor(() => {
      expect(setChatId).toHaveBeenCalledWith("first-chat");
    });

    expect(createChat).not.toHaveBeenCalled();
    expect(getLastHref()).toBe("/chat/first-chat");
  });

  it("renders only Redirect (no additional UI) when there are no chats", async () => {
    const setChatId = jest.fn();
    const createChat = jest.fn().mockReturnValue("new-id");

    (useChatStore as jest.Mock).mockReturnValue({ chats: [], createChat });
    (useGlobalStore as jest.Mock).mockReturnValue({
      chatId: "new-id",
      setChatId,
    });

    const { toJSON } = render(<Home />);

    // Since our Redirect mock returns null, nothing else should render
    expect(toJSON()).toBeNull();
  });

  it("runs side-effects only once on rerender (no chats)", async () => {
    const setChatId = jest.fn();
    const createChat = jest.fn().mockReturnValue("new-id");

    (useChatStore as jest.Mock).mockReturnValue({ chats: [], createChat });
    (useGlobalStore as jest.Mock).mockReturnValue({
      chatId: "new-id",
      setChatId,
    });

    const { rerender } = render(<Home />);

    await waitFor(() => {
      expect(createChat).toHaveBeenCalledTimes(1);
      expect(setChatId).toHaveBeenCalledTimes(1);
    });

    rerender(<Home />);

    // Effect deps should be stable; no additional calls
    expect(createChat).toHaveBeenCalledTimes(1);
    expect(setChatId).toHaveBeenCalledTimes(1);
  });

  it("runs side-effects only once on rerender (existing chats)", async () => {
    const setChatId = jest.fn();
    const createChat = jest.fn();
    const chats = [{ id: "first-chat" }];

    (useChatStore as jest.Mock).mockReturnValue({ chats, createChat });
    (useGlobalStore as jest.Mock).mockReturnValue({ chatId: null, setChatId });

    const { rerender } = render(<Home />);

    await waitFor(() => {
      expect(setChatId).toHaveBeenCalledTimes(1);
      expect(setChatId).toHaveBeenCalledWith("first-chat");
    });

    rerender(<Home />);

    // No additional effect run
    expect(setChatId).toHaveBeenCalledTimes(1);
    expect(createChat).not.toHaveBeenCalled();
  });
});
