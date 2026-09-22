import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mic, MicOff, Plus, Trash2, Volume2, VolumeX } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SPEECH_LANGS, useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useSpeech";
import { useLanguage } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Sahiti AI | Business questions answered" },
      {
        name: "description",
        content:
          "Ask Sahiti AI about loans, schemes, documents and running a micro business, by typing or by voice, in any supported language.",
      },
      { property: "og:title", content: "Sahiti AI assistant" },
      { property: "og:description", content: "Business and finance questions in simple language." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

function Assistant() {
  const { user } = useSession();
  const { locale } = useLanguage();
  const queryClient = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);

  const speechLang = SPEECH_LANGS[locale];

  const dictation = useSpeechRecognition({
    onTranscript: useCallback((text: string) => setInput(text), []),
    lang: speechLang,
  });
  const speech = useSpeechSynthesis(speechLang);

  const { data: threads = [] } = useQuery({
    queryKey: ["threads", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: stored = [] } = useQuery({
    queryKey: ["thread-messages", threadId],
    enabled: Boolean(threadId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ChatMessage[];
    },
  });

  const messages = [...stored, ...pending];

  function startDictation() {
    // Start from a clean slate so the transcript does not append to old text.
    setInput("");
    dictation.clearError();
    dictation.start();
  }

  function toggleDictation() {
    if (dictation.listening) dictation.stop();
    else startDictation();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    if (dictation.listening) dictation.stop();
    setBusy(true);
    setInput("");
    setStreaming("");

    let activeThread = threadId;
    try {
      if (!activeThread) {
        const { data, error } = await supabase
          .from("chat_threads")
          .insert({ user_id: user!.id, title: question.slice(0, 60) })
          .select("id")
          .single();
        if (error) throw error;
        activeThread = data.id;
        setThreadId(activeThread);
        await queryClient.invalidateQueries({ queryKey: ["threads", user?.id] });
      }

      setPending([{ id: `local-${Date.now()}`, role: "user", content: question }]);
      await supabase.from("chat_messages").insert({
        thread_id: activeThread,
        user_id: user!.id,
        role: "user",
        content: question,
      });

      const history = [...messages, { role: "user" as const, content: question }].map((item) => ({
        role: item.role,
        content: item.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.text();
        let message = "The assistant could not reply";
        try {
          const parsed = JSON.parse(detail) as { error?: string };
          if (parsed.error) message = parsed.error;
        } catch {
          if (detail.trim()) message = detail.slice(0, 200);
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setStreaming(answer);
      }

      if (answer.trim()) {
        await supabase.from("chat_messages").insert({
          thread_id: activeThread,
          user_id: user!.id,
          role: "assistant",
          content: answer,
        });
        if (speech.enabled) speech.speak(answer);
      }

      await supabase
        .from("chat_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeThread);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The assistant is unavailable");
    } finally {
      setStreaming("");
      setPending([]);
      setBusy(false);
      await queryClient.invalidateQueries({ queryKey: ["thread-messages", activeThread] });
      await queryClient.invalidateQueries({ queryKey: ["threads", user?.id] });
    }
  }

  async function deleteThread(id: string) {
    await supabase.from("chat_threads").delete().eq("id", id);
    if (threadId === id) setThreadId(null);
    await queryClient.invalidateQueries({ queryKey: ["threads", user?.id] });
  }

  function toggleSpeech() {
    const next = !speech.enabled;
    speech.setEnabled(next);
    if (!next) speech.cancel();
    toast.success(next ? "Replies will be read aloud" : "Spoken replies off");
  }

  return (
    <>
      <PageHeader
        title="Sahiti AI"
        description="Type or talk. Ask about loans, schemes or costs."
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="sahiti-panel p-4">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              dictation.stop();
              setThreadId(null);
              setPending([]);
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            New conversation
          </Button>

          <ul className="mt-4 space-y-1">
            {threads.map((thread) => (
              <li key={thread.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setThreadId(thread.id)}
                  className={cn(
                    "min-w-0 flex-1 truncate rounded-md px-2 py-2 text-left text-sm",
                    threadId === thread.id
                      ? "bg-primary font-medium text-primary-foreground"
                      : "hover:bg-secondary",
                  )}
                >
                  {thread.title}
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete conversation ${thread.title}`}
                  onClick={() => void deleteThread(thread.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
            {threads.length === 0 && (
              <li className="px-2 py-2 text-sm text-muted-foreground">Nothing here yet.</li>
            )}
          </ul>
        </aside>

        <div className="sahiti-panel flex h-[70dvh] min-h-[420px] flex-col overflow-hidden">
          <Conversation className="flex-1" initial="instant" resize="instant">
            <ConversationContent>
              {messages.length === 0 && !streaming && (
                <ConversationEmptyState
                  title="Ask your first question"
                  description="Tap the microphone and speak, or type. Try: how much loan can I get with ₹50,000 of my own money?"
                />
              )}

              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.role === "assistant" ? (
                      <MessageResponse>{message.content}</MessageResponse>
                    ) : (
                      message.content
                    )}
                  </MessageContent>
                </Message>
              ))}

              {streaming && (
                <Message from="assistant">
                  <MessageContent>
                    <MessageResponse>{streaming}</MessageResponse>
                  </MessageContent>
                </Message>
              )}

              {busy && !streaming && <Shimmer>Thinking…</Shimmer>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t p-3">
            <PromptInput onSubmit={(_message, event) => void send(event)}>
              <PromptInputTextarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  dictation.listening ? "Listening…" : "Ask a business or finance question"
                }
              />
              <PromptInputFooter>
                <PromptInputTools>
                  <PromptInputButton
                    tooltip={dictation.listening ? "Stop dictation" : "Speak your question"}
                    aria-pressed={dictation.listening}
                    disabled={!dictation.supported}
                    className={dictation.listening ? "text-destructive" : undefined}
                    onClick={toggleDictation}
                  >
                    {dictation.listening ? (
                      <MicOff aria-hidden="true" className="size-4" />
                    ) : (
                      <Mic aria-hidden="true" className="size-4" />
                    )}
                    <span className="sr-only">
                      {dictation.listening ? "Stop dictation" : "Speak your question"}
                    </span>
                  </PromptInputButton>

                  <PromptInputButton
                    tooltip={speech.enabled ? "Turn off spoken replies" : "Read replies aloud"}
                    aria-pressed={speech.enabled}
                    disabled={!speech.supported}
                    className={speech.enabled ? "text-primary" : undefined}
                    onClick={toggleSpeech}
                  >
                    {speech.enabled ? (
                      <Volume2 aria-hidden="true" className="size-4" />
                    ) : (
                      <VolumeX aria-hidden="true" className="size-4" />
                    )}
                    <span className="sr-only">
                      {speech.enabled ? "Turn off spoken replies" : "Read replies aloud"}
                    </span>
                  </PromptInputButton>
                </PromptInputTools>

                <PromptInputSubmit status={busy ? "submitted" : "ready"} disabled={busy} />
              </PromptInputFooter>
            </PromptInput>

            {dictation.error && (
              <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                {dictation.error}
              </p>
            )}

            {!dictation.supported && (
              <p className="mt-2 text-xs text-muted-foreground">
                Voice input needs a browser with speech recognition, such as Chrome or Edge.
              </p>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              Sahiti AI can be wrong. Confirm scheme terms with your bank.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
