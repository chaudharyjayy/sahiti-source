import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

/*
 * Voice support for the assistant.
 *
 * Both features sit behind browser APIs that are not in every browser and not in
 * the TypeScript DOM lib, so the shape of SpeechRecognition is declared locally
 * and every entry point reports `supported` rather than throwing.
 */

type RecognitionAlternative = { transcript: string };
type RecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative;
};
type RecognitionResultList = {
  length: number;
  [index: number]: RecognitionResult;
};

type RecognitionEvent = {
  resultIndex: number;
  results: RecognitionResultList;
};

type RecognitionErrorEvent = { error: string };

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type RecognitionConstructor = new () => RecognitionInstance;

type SpeechWindow = {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const scope = window as unknown as SpeechWindow;
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

export const SPEECH_LANGS: Record<Locale, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
};

/** Turns an error code into something a person can act on. */
function describeRecognitionError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow it in your browser settings.";
    case "no-speech":
      return "Nothing was picked up. Try again a little closer to the mic.";
    case "audio-capture":
      return "No microphone found on this device.";
    case "network":
      return "Speech recognition needs a connection.";
    default:
      return "Voice input stopped unexpectedly.";
  }
}

/**
 * Live dictation. The transcript is streamed to `onTranscript` as the person
 * speaks, including interim words, so the textarea fills in as they go.
 */
export function useSpeechRecognition({
  onTranscript,
  lang,
}: {
  onTranscript: (text: string) => void;
  lang: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const instanceRef = useRef<RecognitionInstance | null>(null);
  // Kept in refs so a changing callback never restarts an active session.
  const transcriptRef = useRef(onTranscript);
  const langRef = useRef(lang);
  const finalRef = useRef("");

  useEffect(() => {
    transcriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    setSupported(Boolean(getRecognitionConstructor()));
    return () => {
      instanceRef.current?.abort();
      instanceRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    instanceRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    setError(null);

    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setError("This browser does not support voice input.");
      return;
    }
    if (instanceRef.current) return;

    const recognition = new Recognition();
    recognition.lang = langRef.current;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    finalRef.current = "";

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (!result) continue;
        const alternative = result[0];
        if (!alternative) continue;
        if (result.isFinal) {
          finalRef.current += alternative.transcript;
        } else {
          interim += alternative.transcript;
        }
      }
      transcriptRef.current(`${finalRef.current}${interim}`.trimStart());
    };

    recognition.onerror = (event) => {
      setError(describeRecognitionError(event.error));
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      instanceRef.current = null;
    };

    instanceRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // start() throws if a session is already running; treat it as a no-op.
      instanceRef.current = null;
      setListening(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  const clearError = useCallback(() => setError(null), []);

  return { supported, listening, error, start, stop, toggle, clearError };
}

/**
 * Removes the markdown furniture the answers are written in, so the spoken
 * version does not read out asterisks and backticks.
 */
export function toSpeechText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " code block omitted. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .replace(/(\*\*|__|\*|_)/g, "")
    .replace(/\|/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Spoken replies through the browser's own voice. */
export function useSpeechSynthesis(lang: string) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const langRef = useRef(lang);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const phrase = toSpeechText(text);
    if (!phrase) return;

    // Queueing several utterances back to back reads robotic, so replace.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = langRef.current;

    const voices = window.speechSynthesis.getVoices();
    const exact = voices.find((voice) => voice.lang === langRef.current);
    const languageMatch = voices.find(
      (voice) => voice.lang.split("-")[0] === langRef.current.split("-")[0],
    );
    const chosen = exact ?? languageMatch;
    if (chosen) utterance.voice = chosen;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  return { supported, speaking, enabled, setEnabled, speak, cancel };
}
