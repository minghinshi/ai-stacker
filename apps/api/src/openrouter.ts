import { OpenRouter } from "@openrouter/sdk";

function readApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set. Export it before starting the server.");
  }
  return key;
}

export const openRouter = new OpenRouter({
  apiKey: readApiKey(),
});
