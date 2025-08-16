import { streamText, convertToModelMessages } from "ai";
import { createGateway } from "@ai-sdk/gateway";

// Function that handles the POST request and returns the stream of messages from the selected model
export async function POST(req: Request) {
  const { messages, selectedModel, apiKey } = await req.json();

  const gateway = createGateway({
    apiKey,
    baseURL: "https://ai-gateway.vercel.sh/v1/ai",
  });

  const result = streamText({
    model: gateway(selectedModel.value),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
}
