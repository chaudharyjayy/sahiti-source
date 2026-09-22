import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { serverSecret } from "@/lib/loadDotEnv";

const SYSTEM_PROMPT = `You are Sahiti, a business advisory assistant for rural micro-entrepreneurs in India.

Scope: answer only questions about business, finance, loans, government business schemes, documents, pricing, costs, market demand, and running or growing a micro business. If the question is outside that scope, say briefly that you can only help with business and finance topics, and invite a business question.

Style: simple, plain language, short sentences and short paragraphs. Use Indian rupees. Prefer concrete steps and small numbered lists. Reply in the same language the user writes in.

Honesty: you are not a bank, lender or licensed adviser. Scheme rates, eligibility and document requirements change, so tell the user to confirm with their bank branch or the official scheme portal. Never promise approval or guaranteed returns. Never ask for Aadhaar, PAN, bank account or card numbers.`;

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = serverSecret("GEMINI_API_KEY");
        if (!apiKey) {
          return jsonError(
            "AI is not configured. Add GEMINI_API_KEY to .env and restart the server.",
            503,
          );
        }

        let body: { messages?: { role: "user" | "assistant"; content: string }[] };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return jsonError("Request body must be JSON", 400);
        }
        const messages = (body.messages ?? []).slice(-20);
        if (messages.length === 0) {
          return jsonError("No messages supplied", 400);
        }

        const modelId = serverSecret("GEMINI_MODEL") ?? "gemini-3.6-flash";
        const gemini = createOpenAI({
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey,
        });

        try {
          const result = await generateText({
            model: gemini.chat(modelId),
            system: SYSTEM_PROMPT,
            messages,
            maxRetries: 1,
          });
          if (!result.text.trim()) {
            return jsonError("The assistant returned an empty reply. Try again.", 502);
          }
          return new Response(result.text, {
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "The assistant is unavailable";
          console.error("[chat]", modelId, message);
          return jsonError(message, 502);
        }
      },
    },
  },
});
