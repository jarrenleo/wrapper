import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

// Mocks
jest.mock("~/hooks/useGlobalStore", () => ({ useGlobalStore: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("~/lib/icons/ChevronLeft", () => ({ ChevronLeft: () => null }));
jest.mock("~/lib/icons/X", () => ({ X: () => null }));

// Mock router.back
jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

// Mock AI Gateway and AI SDK calls
const mockCreateGateway = jest.fn();
jest.mock("@ai-sdk/gateway", () => ({
  createGateway: (...args: any[]) => mockCreateGateway(...args),
}));

const mockGenerateText = jest.fn();
jest.mock("ai", () => ({
  generateText: (...args: any[]) => mockGenerateText(...args),
}));

// SUT after mocks
import Keys from "../index";

const { useGlobalStore } = jest.requireMock("~/hooks/useGlobalStore");

describe("Keys screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateGateway.mockImplementation(({ apiKey }: any) => {
      // Return a function that returns a model identifier
      return (modelId: string) => `MODEL:${modelId}:${apiKey}`;
    });
  });

  it("prefills input from stored apiKey and keeps secureTextEntry", () => {
    (useGlobalStore as jest.Mock).mockReturnValue({
      apiKey: "sk-prefilled",
      setApiKey: jest.fn(),
      setSelectedModel: jest.fn(),
    });

    const { getByPlaceholderText } = render(<Keys />);
    const input = getByPlaceholderText("Enter your API key");

    expect((input as any).props.value).toBe("sk-prefilled");
    expect((input as any).props.secureTextEntry).toBe(true);
  });

  it("clears input and store when tapping the clear button", () => {
    const setApiKey = jest.fn();
    const setSelectedModel = jest.fn();
    (useGlobalStore as jest.Mock).mockReturnValue({
      apiKey: "sk-to-clear",
      setApiKey,
      setSelectedModel,
    });

    const { getByPlaceholderText, UNSAFE_getAllByType } = render(<Keys />);
    const input = getByPlaceholderText("Enter your API key");
    expect((input as any).props.value).toBe("sk-to-clear");

    // Find the clear Pressable by its absolute className
    const pressables = UNSAFE_getAllByType(require("react-native").Pressable);
    const clearBtn = pressables.find((n: any) =>
      (n.props.className || "").includes("absolute right-3"),
    );
    expect(clearBtn).toBeTruthy();

    fireEvent.press(clearBtn);

    expect(setSelectedModel).toHaveBeenCalledWith({
      label: undefined,
      value: undefined,
    });
    expect(setApiKey).toHaveBeenCalledWith("");
    expect((input as any).props.value).toBe("");
  });

  it("verifies key successfully: updates store and shows success alert", async () => {
    const setApiKey = jest.fn();
    const setSelectedModel = jest.fn();
    (useGlobalStore as jest.Mock).mockReturnValue({
      apiKey: "",
      setApiKey,
      setSelectedModel,
    });

    mockGenerateText.mockResolvedValue({ text: "pong" });

    const RN = require("react-native");
    jest.spyOn(RN.Alert, "alert").mockImplementation(() => {});

    const { getByPlaceholderText, UNSAFE_getAllByType, getByText } = render(
      <Keys />,
    );

    const input = getByPlaceholderText("Enter your API key");
    fireEvent.changeText(input, "sk-verified");

    // Find "Verify" button by Pressable with style marginBottom: 4
    const pressables = UNSAFE_getAllByType(RN.Pressable);
    const verifyBtn = pressables.find(
      (n: any) => n.props.style?.marginBottom === 4,
    );
    expect(verifyBtn).toBeTruthy();

    fireEvent.press(verifyBtn);

    await waitFor(() => {
      expect(mockGenerateText).toHaveBeenCalled();
      expect(setApiKey).toHaveBeenCalledWith("sk-verified");
      expect(setSelectedModel).toHaveBeenCalledWith({
        label: "GPT-5",
        value: "openai/gpt-5",
      });
      expect(RN.Alert.alert).toHaveBeenCalledWith(
        "Success",
        "AI Gateway API Key verified successfully",
      );
    });
  });

  it("handles verification failure: shows error alert and does not update store", async () => {
    const setApiKey = jest.fn();
    const setSelectedModel = jest.fn();
    (useGlobalStore as jest.Mock).mockReturnValue({
      apiKey: "",
      setApiKey,
      setSelectedModel,
    });

    mockGenerateText.mockRejectedValue(new Error("bad key"));

    const RN = require("react-native");
    jest.spyOn(RN.Alert, "alert").mockImplementation(() => {});

    const { getByPlaceholderText, UNSAFE_getAllByType } = render(<Keys />);

    const input = getByPlaceholderText("Enter your API key");
    fireEvent.changeText(input, "sk-bad");

    const pressables = UNSAFE_getAllByType(RN.Pressable);
    const verifyBtn = pressables.find(
      (n: any) => n.props.style?.marginBottom === 4,
    );
    fireEvent.press(verifyBtn);

    await waitFor(() => {
      expect(RN.Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Invalid AI Gateway API key",
      );
      expect(setApiKey).not.toHaveBeenCalled();
      expect(setSelectedModel).not.toHaveBeenCalled();
    });
  });

  it("disables Verify when input is empty and when apiKey already exists", () => {
    const RN = require("react-native");

    // Empty input → disabled
    (useGlobalStore as jest.Mock).mockReturnValue({
      apiKey: "",
      setApiKey: jest.fn(),
      setSelectedModel: jest.fn(),
    });
    const { UNSAFE_getAllByType, unmount } = render(<Keys />);
    let pressables = UNSAFE_getAllByType(RN.Pressable);
    let verifyBtn = pressables.find(
      (n: any) => n.props.style?.marginBottom === 4,
    );
    expect(verifyBtn?.props.disabled).toBe(true);
    unmount();

    // Existing apiKey → disabled
    (useGlobalStore as jest.Mock).mockReturnValue({
      apiKey: "sk-exists",
      setApiKey: jest.fn(),
      setSelectedModel: jest.fn(),
    });
    const { UNSAFE_getAllByType: getAllByType2 } = render(<Keys />);
    pressables = getAllByType2(RN.Pressable);
    verifyBtn = pressables.find((n: any) => n.props.style?.marginBottom === 4);
    expect(verifyBtn?.props.disabled).toBe(true);
  });

  it("opens docs link on press", () => {
    const RN = require("react-native");
    jest
      .spyOn(RN.Linking, "openURL")
      .mockImplementation(() => Promise.resolve());

    (useGlobalStore as jest.Mock).mockReturnValue({
      apiKey: "",
      setApiKey: jest.fn(),
      setSelectedModel: jest.fn(),
    });

    const { getByText } = render(<Keys />);
    const docs = getByText("docs");
    fireEvent.press(docs);

    expect(RN.Linking.openURL).toHaveBeenCalledWith(
      "https://vercel.com/docs/ai-gateway",
    );
  });
});
