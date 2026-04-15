import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Sonnet for analysis, Haiku for chat
const ANALYSIS_MODEL = "claude-sonnet-4-20250514";
const CHAT_MODEL = "claude-haiku-4-5-20251001";

// ─── Rough cost tracking (cents) ────────────────────────────────
// Based on approximate pricing: Sonnet input ~$3/MTok, output ~$15/MTok
// Haiku input ~$0.80/MTok, output ~$4/MTok
function estimateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  if (model.includes("sonnet")) {
    return (inputTokens * 0.3 + outputTokens * 1.5) / 100_000;
  }
  // Haiku
  return (inputTokens * 0.08 + outputTokens * 0.4) / 100_000;
}

// ─── Text completion ────────────────────────────────────────────

export interface TextCompletionOptions {
  system?: string;
  maxTokens?: number;
  model?: "analysis" | "chat";
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

export async function complete(
  prompt: string,
  options: TextCompletionOptions = {}
): Promise<CompletionResult> {
  const model = options.model === "chat" ? CHAT_MODEL : ANALYSIS_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens || 2048,
    system: options.system || "",
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type === "text") return block.text;
      return "";
    })
    .join("\n");

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  return {
    text,
    inputTokens,
    outputTokens,
    costCents: estimateCostCents(model, inputTokens, outputTokens),
  };
}

// ─── Vision (image analysis) ────────────────────────────────────

export async function analyzeImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  prompt: string
): Promise<CompletionResult> {
  const response = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type === "text") return block.text;
      return "";
    })
    .join("\n");

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  return {
    text,
    inputTokens,
    outputTokens,
    costCents: estimateCostCents(ANALYSIS_MODEL, inputTokens, outputTokens),
  };
}

// ─── Chat with report context ───────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatAboutReport(
  messages: ChatMessage[],
  reportContext: string
): Promise<CompletionResult> {
  const system = buildChatSystemPrompt(reportContext);

  const response = await client.messages.create({
    model: CHAT_MODEL,
    max_tokens: 2048,
    system,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type === "text") return block.text;
      return "";
    })
    .join("\n");

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  return {
    text,
    inputTokens,
    outputTokens,
    costCents: estimateCostCents(CHAT_MODEL, inputTokens, outputTokens),
  };
}

// ─── Streaming chat ─────────────────────────────────────────────

function buildChatSystemPrompt(reportContext: string): string {
  return `You are Dejankify's AI assistant. The user is viewing a web page audit report.
Here is the structured audit report data for context:

${reportContext}

Help the user understand the issues found, suggest fixes, and provide code snippets when asked.
Be concise, practical, and give actionable advice. When providing HTML/CSS fixes, use code blocks.
Use markdown formatting for code snippets and emphasis.`;
}

export function streamChatAboutReport(
  messages: ChatMessage[],
  reportContext: string
): ReadableStream<Uint8Array> {
  const system = buildChatSystemPrompt(reportContext);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: CHAT_MODEL,
          max_tokens: 2048,
          system,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
        }

        // Send final message with usage stats
        const finalMessage = await stream.finalMessage();
        const inputTokens = finalMessage.usage.input_tokens;
        const outputTokens = finalMessage.usage.output_tokens;
        const costCents = estimateCostCents(CHAT_MODEL, inputTokens, outputTokens);

        const doneChunk = `data: ${JSON.stringify({ done: true, costCents })}\n\n`;
        controller.enqueue(encoder.encode(doneChunk));
        controller.close();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Stream error";
        const errChunk = `data: ${JSON.stringify({ error: errorMsg })}\n\n`;
        controller.enqueue(encoder.encode(errChunk));
        controller.close();
      }
    },
  });
}
