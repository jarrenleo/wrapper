import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ModelSheet from "../ModelSheet";

// Mocks
jest.mock("~/hooks/useGlobalStore", () => ({ useGlobalStore: jest.fn() }));
jest.mock("~/lib/useColorScheme", () => ({ useColorScheme: jest.fn() }));
// Do not mock Text to avoid factory-time CSS interop

// Icons as no-op components
jest.mock("~/lib/icons/X", () => ({
  X: () => null,
}));
jest.mock("~/lib/icons/ChevronDown", () => ({
  ChevronDown: () => null,
}));

// Inline mock for @gorhom/bottom-sheet with helpers
jest.mock("@gorhom/bottom-sheet", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  let lastModalApi: { present: jest.Mock; dismiss: jest.Mock } | null = null;
  let lastModalProps: any = null;

  const BottomSheetModal = (forwardRef as any)((props: any, ref: any) => {
    lastModalProps = props;
    const api = { present: jest.fn(), dismiss: jest.fn() };
    lastModalApi = api;
    useImperativeHandle(ref, () => api);
    return props.children ?? null;
  });

  const BottomSheetView = ({ children }: any) => children ?? null;

  const BottomSheetFlatList = ({ data, renderItem }: any) =>
    (data || []).map((item: any, i: number) => renderItem({ item }));

  return {
    BottomSheetModal,
    BottomSheetView,
    BottomSheetFlatList,
    __getLastModalApi: () => lastModalApi,
    __getLastModalProps: () => lastModalProps,
  };
});

const { useGlobalStore } = jest.requireMock("~/hooks/useGlobalStore");
const { useColorScheme } = jest.requireMock("~/lib/useColorScheme");

// Utilities to get last modal API/props from the mock
const getModalApi = () =>
  jest.requireMock("@gorhom/bottom-sheet").__getLastModalApi();
const getModalProps = () =>
  jest.requireMock("@gorhom/bottom-sheet").__getLastModalProps();

// Silence React key warning from FlatList mock in this file only
let originalConsoleError: any;
beforeAll(() => {
  originalConsoleError = console.error;
  jest.spyOn(console, "error").mockImplementation((...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes('Each child in a list should have a unique "key" prop')
    ) {
      return;
    }
    originalConsoleError(...(args as any));
  });
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

describe("ModelSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default light mode
    (useColorScheme as jest.Mock).mockReturnValue({ isDarkColorScheme: false });
  });

  it('renders "No API Key" and no list when apiKey missing, snapPoints ["20%"], opens on trigger press', () => {
    (useGlobalStore as jest.Mock).mockReturnValue({
      selectedModel: { label: undefined, value: undefined },
      setSelectedModel: jest.fn(),
      apiKey: "",
    });

    const { getByText, queryByText } = render(<ModelSheet />);

    // Trigger label
    expect(getByText("No API Key")).toBeTruthy();
    // No list when no api key
    expect(queryByText("GPT-5 nano")).toBeNull();

    // snapPoints should be ["20%"]
    expect(getModalProps().snapPoints).toEqual(["20%"]);

    // Pressing the trigger opens the modal (calls present)
    fireEvent.press(getByText("No API Key"));
    expect(getModalApi().present).toHaveBeenCalled();
  });

  it("renders list and selects a model when apiKey present, and snapPoints is ['75%']", () => {
    const setSelectedModel = jest.fn();
    (useGlobalStore as jest.Mock).mockReturnValue({
      selectedModel: { label: "GPT-5", value: "openai/gpt-5" },
      setSelectedModel,
      apiKey: "sk-123",
    });

    const { getAllByText, getByText } = render(<ModelSheet />);

    // Trigger shows selected label (first occurrence is the trigger button)
    const gpt5Elements = getAllByText("GPT-5");
    expect(gpt5Elements[0]).toBeTruthy();

    // Open modal via trigger
    fireEvent.press(gpt5Elements[0]);
    expect(getModalApi().present).toHaveBeenCalled();

    // List should render since apiKey exists
    expect(getByText("GPT-5 nano")).toBeTruthy();

    // Select a specific model
    fireEvent.press(getByText("GPT-5 nano"));
    expect(setSelectedModel).toHaveBeenCalledWith({
      label: "GPT-5 nano",
      value: "openai/gpt-5-nano",
    });
    expect(getModalApi().dismiss).toHaveBeenCalled();

    // snapPoints should be ["75%"]
    expect(getModalProps().snapPoints).toEqual(["75%"]);
  });

  it("applies bold styling only for currently selected model label when apiKey present", () => {
    (useGlobalStore as jest.Mock).mockReturnValue({
      selectedModel: { label: "Grok 4", value: "xai/grok-4" },
      setSelectedModel: jest.fn(),
      apiKey: "sk-123",
    });

    const { getAllByText, getByText } = render(<ModelSheet />);

    // Get the list item (second occurrence, first is the trigger button)
    const grokElements = getAllByText("Grok 4");
    const selectedNode = grokElements[1]; // The one in the list
    const unselectedNode = getByText("GPT-5 mini");

    expect(selectedNode.props.className || "").toContain("font-bold");
    expect(unselectedNode.props.className || "").not.toContain("font-bold");
  });

  // Close icon press test omitted due to lack of stable selector without modifying component

  it("sets styles based on color scheme (light)", () => {
    (useColorScheme as jest.Mock).mockReturnValue({ isDarkColorScheme: false });
    (useGlobalStore as jest.Mock).mockReturnValue({
      selectedModel: { label: "GPT-5", value: "openai/gpt-5" },
      setSelectedModel: jest.fn(),
      apiKey: "sk-123",
    });

    render(<ModelSheet />);
    const modalProps = getModalProps();
    expect(modalProps.handleIndicatorStyle.backgroundColor).toBe(
      "hsl(223.8136 0% 32.3067%)",
    );
    expect(modalProps.backgroundStyle.backgroundColor).toBe(
      "hsl(223.8136 0.0002% 96.0587%)",
    );
  });

  it("sets styles based on color scheme (dark)", () => {
    (useColorScheme as jest.Mock).mockReturnValue({ isDarkColorScheme: true });
    (useGlobalStore as jest.Mock).mockReturnValue({
      selectedModel: { label: "GPT-5", value: "openai/gpt-5" },
      setSelectedModel: jest.fn(),
      apiKey: "sk-123",
    });

    render(<ModelSheet />);
    const modalProps = getModalProps();
    expect(modalProps.handleIndicatorStyle.backgroundColor).toBe(
      "hsl(223.8136 0% 64.471%)",
    );
    expect(modalProps.backgroundStyle.backgroundColor).toBe(
      "hsl(223.8136 0% 11.304%)",
    );
  });
});
