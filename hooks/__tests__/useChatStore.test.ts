/* Tests for hooks/useChatStore.ts */
import * as SecureStore from "expo-secure-store";
import { act, waitFor } from "@testing-library/react-native";

// Mock the 'ai' module to control generateId
jest.mock("ai", () => {
  let counter = 0;
  return {
    generateId: jest.fn(() => `id-${++counter}`),
  };
});

import { useChatStore } from "../useChatStore";

const initialState = {
  chats: [] as any[],
};

const textMsg = (id: string, role: "user" | "assistant", text: string) =>
  ({
    id,
    role,
    parts: [{ type: "text", text }],
  }) as any;

describe("useChatStore (zustand + persist)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (SecureStore as any).__reset?.();

    // Reset store state (keep actions intact)
    act(() => {
      useChatStore.setState({ ...initialState });
    });

    // Reset generateId mock behavior and counter per test
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ai = require("ai") as { generateId: jest.Mock };
    ai.generateId.mockReset();
    let c = 0;
    ai.generateId.mockImplementation(() => `id-${++c}`);
  });

  it("initializes with defaults", () => {
    const s = useChatStore.getState();
    expect(s.chats).toEqual([]);
  });

  it("createChat creates and prepends new chat, returns id, and persists", async () => {
    const setSpy = jest.spyOn(SecureStore, "setItemAsync");

    let id1 = "";
    act(() => {
      id1 = useChatStore.getState().createChat();
    });

    let id2 = "";
    act(() => {
      id2 = useChatStore.getState().createChat();
    });

    const { chats } = useChatStore.getState();
    expect(id1).toBe("id-1");
    expect(id2).toBe("id-2");
    expect(chats.map((c) => c.id)).toEqual(["id-2", "id-1"]); // prepended order
    expect(chats[0]).toMatchObject({
      id: "id-2",
      title: "",
      description: "",
      messages: [],
    });

    // Persistence assertions
    await waitFor(() => {
      expect(setSpy).toHaveBeenCalled();
      const calls = (setSpy as jest.Mock).mock.calls as [string, string][];
      const last = calls[calls.length - 1];
      expect(last[0]).toBe("chat-store");
      const payload = JSON.parse(last[1]);
      expect(payload.state.chats.length).toBe(2);
      expect(payload.state.chats[0].id).toBe("id-2");
    });
  });

  it("loadChat returns chat by id or undefined", () => {
    let id = "";
    act(() => {
      id = useChatStore.getState().createChat();
    });

    const found = useChatStore.getState().loadChat(id);
    const notFound = useChatStore.getState().loadChat("missing");
    expect(found?.id).toBe(id);
    expect(notFound).toBeUndefined();
  });

  it("updateChatTitle updates only title and persists", async () => {
    const setSpy = jest.spyOn(SecureStore, "setItemAsync");
    let id = "";
    act(() => {
      id = useChatStore.getState().createChat();
    });

    act(() => {
      useChatStore.getState().updateChatTitle(id, "New Title");
    });

    const chat = useChatStore.getState().loadChat(id)!;
    expect(chat.title).toBe("New Title");
    expect(chat.description).toBe("");

    await waitFor(() => {
      expect(setSpy).toHaveBeenCalled();
      const calls = (setSpy as jest.Mock).mock.calls as [string, string][];
      const last = calls[calls.length - 1];
      const payload = JSON.parse(last[1]);
      expect(payload.state.chats.find((c: any) => c.id === id).title).toBe(
        "New Title",
      );
    });
  });

  it("updateChatDescription updates only description and persists", async () => {
    const setSpy = jest.spyOn(SecureStore, "setItemAsync");
    let id = "";
    act(() => {
      id = useChatStore.getState().createChat();
    });

    act(() => {
      useChatStore.getState().updateChatDescription(id, "About this chat");
    });

    const chat = useChatStore.getState().loadChat(id)!;
    expect(chat.description).toBe("About this chat");
    expect(chat.title).toBe("");

    await waitFor(() => {
      expect(setSpy).toHaveBeenCalled();
      const calls = (setSpy as jest.Mock).mock.calls as [string, string][];
      const last = calls[calls.length - 1];
      const payload = JSON.parse(last[1]);
      expect(
        payload.state.chats.find((c: any) => c.id === id).description,
      ).toBe("About this chat");
    });
  });

  it("deleteChat removes the chat and persists", async () => {
    const setSpy = jest.spyOn(SecureStore, "setItemAsync");
    let id1 = "",
      id2 = "";
    act(() => {
      id1 = useChatStore.getState().createChat();
      id2 = useChatStore.getState().createChat();
    });

    act(() => {
      useChatStore.getState().deleteChat(id1);
    });

    const ids = useChatStore.getState().chats.map((c) => c.id);
    expect(ids).toEqual(["id-2"]);

    await waitFor(() => {
      expect(setSpy).toHaveBeenCalled();
      const calls = (setSpy as jest.Mock).mock.calls as [string, string][];
      const last = calls[calls.length - 1];
      const payload = JSON.parse(last[1]);
      expect(payload.state.chats.map((c: any) => c.id)).toEqual(["id-2"]);
    });
  });

  it("addMessage appends message to the chat and persists", async () => {
    const setSpy = jest.spyOn(SecureStore, "setItemAsync");
    let id = "";
    act(() => {
      id = useChatStore.getState().createChat();
    });

    const m1 = textMsg("m1", "user", "Hello");
    const m2 = textMsg("m2", "assistant", "Hi");

    act(() => {
      useChatStore.getState().addMessage(id, m1);
      useChatStore.getState().addMessage(id, m2);
    });

    const chat = useChatStore.getState().loadChat(id)!;
    expect(chat.messages.map((m) => m.id)).toEqual(["m1", "m2"]);

    await waitFor(() => {
      expect(setSpy).toHaveBeenCalled();
      const calls = (setSpy as jest.Mock).mock.calls as [string, string][];
      const last = calls[calls.length - 1];
      const payload = JSON.parse(last[1]);
      const hydrated = payload.state.chats.find((c: any) => c.id === id);
      expect(hydrated.messages.map((m: any) => m.id)).toEqual(["m1", "m2"]);
    });
  });

  it("rehydrates from SecureStore payload", async () => {
    const payload = {
      state: {
        chats: [
          {
            id: "id-9",
            title: "Title",
            description: "Desc",
            messages: [textMsg("mx", "user", "persisted")],
          },
        ],
      },
      version: 0,
    };

    jest
      .spyOn(SecureStore, "getItemAsync")
      .mockResolvedValueOnce(JSON.stringify(payload) as any);

    await act(async () => {
      await useChatStore.persist.rehydrate();
    });

    const s = useChatStore.getState();
    expect(s.chats).toHaveLength(1);
    expect(s.chats[0]).toMatchObject({
      id: "id-9",
      title: "Title",
      description: "Desc",
    });
    expect(s.chats[0].messages[0].id).toBe("mx");
  });

  it("handles malformed persisted JSON gracefully", async () => {
    jest
      .spyOn(SecureStore, "getItemAsync")
      .mockResolvedValueOnce("not-json" as any);

    await expect(
      (async () => {
        await useChatStore.persist.rehydrate();
      })(),
    ).resolves.toBeUndefined();

    const s = useChatStore.getState();
    expect(s.chats).toEqual([]);
  });

  it("subscribe receives updates on actions", () => {
    const cb = jest.fn();
    const unsub = useChatStore.subscribe(cb);

    act(() => {
      useChatStore.getState().createChat();
    });

    expect(cb).toHaveBeenCalled();
    const [newState] = cb.mock.calls[0];
    expect(newState.chats.length).toBe(1);

    unsub();
  });
});
