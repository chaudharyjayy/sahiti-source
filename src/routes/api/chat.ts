import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";

const SYSTEM_PROMPT = `You are Sahiti, a business advisory assistant for rural micro-entrepreneurs in India.

Scope: answer only questions about business, finance, loans, government business schemes, documents, pricing, costs, market demand, and running or growing a micro business. If the question is outside that scope, say briefly that you can only help with business and finance topics, and invite a business question.

Style: simple, plain language, short sentences and short paragraphs. Use Indian rupees. Prefer concrete steps and small numbered lists. Reply in the same language the user writes in.

Honesty: you are not a bank, lender or licensed adviser. Scheme rates, eligibility and document requirements change, so tell the user to confirm with their bank branch or the official scheme portal. Never promise approval or guaranteed returns. Never ask for Aadhaar, PAN, bank account or card numbers.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["GEMINI_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI is not configured" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const body = (await request.json()) as {
          messages?: { role: "user" | "assistant"; content: string }[];
        };
        const messages = (body.messages ?? []).slice(-20);
        if (messages.length === 0) {
          return new Response(JSON.stringify({ error: "No messages supplied" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        // Gemini's OpenAI-compatible endpoint — no extra package needed.
        const gemini = createOpenAI({
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey,
        });

        try {
          const result = streamText({
            model: gemini.chat("gemini-3.6-flash"),
            system: SYSTEM_PROMPT,
            messages,
          });
          return result.toTextStreamResponse();
        } catch (error) {
          const message = error instanceof Error ? error.message : "The assistant is unavailable";
          return new Response(JSON.stringify({ error: message }), {
            status: 502,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
