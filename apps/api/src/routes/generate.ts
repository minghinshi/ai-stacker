import { Router } from "express";
import type { ChatResult, ChatStreamChunk } from "@openrouter/sdk/models";
import { openRouter } from "../openrouter.ts";

interface GenerateRequestBody {
  model?: unknown;
  prompt?: unknown;
}

interface GenerateResponseBody {
  content: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isChatResult(
  value: ChatResult | { [Symbol.asyncIterator](): AsyncIterator<ChatStreamChunk> },
): value is ChatResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "choices" in value &&
    Array.isArray((value as { choices?: unknown }).choices)
  );
}

export const generateRouter: Router = Router();

generateRouter.post("/generate", async (req, res): Promise<void> => {
  const { model, prompt } = req.body as GenerateRequestBody;

  if (!isNonEmptyString(model)) {
    res.status(400).json({ error: "model must be a non-empty string" });
    return;
  }
  if (!isNonEmptyString(prompt)) {
    res.status(400).json({ error: "prompt must be a non-empty string" });
    return;
  }

  let result: ChatResult;
  try {
    const response = await openRouter.chat.send({
      chatRequest: {
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      },
    });
    if (!isChatResult(response)) {
      res.status(502).json({ error: "OpenRouter returned a streaming response unexpectedly" });
      return;
    }
    result = response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `OpenRouter request failed: ${message}` });
    return;
  }

  const firstChoice = result.choices[0];
  const rawContent = firstChoice?.message.content;

  let content = "";
  if (typeof rawContent === "string") {
    content = rawContent;
  }
  // rawContent may be null, undefined, or an array of structured items
  // (e.g. tool calls). For the simple "give the model a prompt, get text
  // back" shape, we ignore non-string content and return "".

  const body: GenerateResponseBody = { content };
  res.status(200).json(body);
});
