import * as SecureStore from "expo-secure-store";
import { act, waitFor } from "@testing-library/react-native";
import { useGlobalStore } from "../useGlobalStore";

const defaultState = {
  chatId: "",
  selectedModel: {
    label: undefined as string | undefined,
    value: undefined as string | undefined,
  },
  apiKey: "",
};

describe("useGlobalStore (zustand + persist)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // reset in-memory SecureStore mock
    (SecureStore as any).__reset?.();
    // Reset store to defaults between tests (replace state)
    act(() => {
      useGlobalStore.setState({ ...defaultState });
    });
  });

  it("initializes with defaults", () => {
    const s = useGlobalStore.getState();
    expect(s.chatId).toBe("");
    expect(s.selectedModel).toEqual({ label: undefined, value: undefined });
    expect(s.apiKey).toBe("");
  });

  it("setChatId updates only chatId and persists", async () => {
    const setSpy = jest.spyOn(SecureStore, "setItemAsync");

    act(() => {
      useGlobalStore.getState().setChatId("abc");
    });

    // State updated
    const s = useGlobalStore.getState();
    expect(s.chatId).toBe("abc");
    expect(s.selectedModel).toEqual({ label: undefined, value: undefined });
    expect(s.apiKey).toBe("");

    // Persist called with correct key and payload
    await waitFor(() => {
      expect(setSpy).toHaveBeenCalled();
      const calls = (setSpy as jest.Mock).mock.calls as [string, string][];
      const last = calls[calls.length - 1];
      expect(last[0]).toBe("global-store");
      const payload = JSON.parse(last[1]);
      expect(payload.state.chatId).toBe("abc");
      expect(payload.state.selectedModel).toEqual({
        label: undefined,
        value: undefined,
      });
      expect(payload.state.apiKey).toBe("");
    });
  });

  it("setSelectedModel updates only selectedModel and persists", async () => {
    const setSpy = jest.spyOn(SecureStore, "setItemAsync");
    const model = { label: "Llama 3", value: "meta-llama/llama-3" };

    act(() => {
      useGlobalStore.getState().setSelectedModel(model);
    });

    const s = useGlobalStore.getState();
    expect(s.selectedModel).toEqual(model);
    expect(s.chatId).toBe("");
    expect(s.apiKey).toBe("");

    await waitFor(() => {
      expect(setSpy).toHaveBeenCalled();
      const calls = (setSpy as jest.Mock).mock.calls as [string, string][];
      const last = calls[calls.length - 1];
      expect(last[0]).toBe("global-store");
      const payload = JSON.parse(last[1]);
      expect(payload.state.selectedModel).toEqual(model);
      expect(payload.state.chatId).toBe("");
      expect(payload.state.apiKey).toBe("");
    });
  });

  it("setApiKey updates only apiKey and persists", async () => {
    const setSpy = jest.spyOn(SecureStore, "setItemAsync");

    act(() => {
      useGlobalStore.getState().setApiKey("sk-123");
    });

    const s = useGlobalStore.getState();
    expect(s.apiKey).toBe("sk-123");
    expect(s.chatId).toBe("");
    expect(s.selectedModel).toEqual({ label: undefined, value: undefined });

    await waitFor(() => {
      expect(setSpy).toHaveBeenCalled();
      const calls = (setSpy as jest.Mock).mock.calls as [string, string][];
      const last = calls[calls.length - 1];
      expect(last[0]).toBe("global-store");
      const payload = JSON.parse(last[1]);
      expect(payload.state.apiKey).toBe("sk-123");
      expect(payload.state.chatId).toBe("");
      expect(payload.state.selectedModel).toEqual({
        label: undefined,
        value: undefined,
      });
    });
  });

  it("rehydrates from SecureStore payload", async () => {
    const persisted = JSON.stringify({
      state: {
        chatId: "rehydrated",
        selectedModel: { label: "Llama 3", value: "meta-llama/llama-3" },
        apiKey: "sk-test",
      },
      version: 0,
    });

    jest
      .spyOn(SecureStore, "getItemAsync")
      .mockResolvedValueOnce(persisted as any);

    await act(async () => {
      await useGlobalStore.persist.rehydrate();
    });

    const s = useGlobalStore.getState();
    expect(s.chatId).toBe("rehydrated");
    expect(s.selectedModel).toEqual({
      label: "Llama 3",
      value: "meta-llama/llama-3",
    });
    expect(s.apiKey).toBe("sk-test");
  });

  it("subscribe receives updates", () => {
    const cb = jest.fn();
    const unsub = useGlobalStore.subscribe(cb);

    act(() => {
      useGlobalStore.getState().setApiKey("sk-xyz");
    });

    expect(cb).toHaveBeenCalled();
    const [newState] = cb.mock.calls[0];
    expect(newState.apiKey).toBe("sk-xyz");

    unsub();
  });

  it("gracefully handles malformed persisted JSON", async () => {
    jest
      .spyOn(SecureStore, "getItemAsync")
      .mockResolvedValueOnce("not-json" as any);

    await expect(
      (async () => {
        await useGlobalStore.persist.rehydrate();
      })(),
    ).resolves.toBeUndefined();

    const s = useGlobalStore.getState();
    expect(s).toMatchObject(defaultState);
  });
});
