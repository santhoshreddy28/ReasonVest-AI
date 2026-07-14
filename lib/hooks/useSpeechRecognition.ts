"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

// Support never changes mid-session, so it's modeled as an external store
// (server snapshot: unsupported, matching SSR) rather than state+effect.
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return !!getSpeechRecognitionCtor();
}
function getServerSnapshot() {
  return false;
}

// Wraps the browser's (non-standard but widely supported) SpeechRecognition
// API for voice input. Feature-detected: callers should hide/disable mic UI
// when `isSupported` is false rather than showing a broken button - this is
// missing entirely on some browsers (notably desktop Firefox).
export function useSpeechRecognition(onResult: (transcript: string, isFinal: boolean) => void) {
  const isSupported = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Keep the latest callback available to the recognition instance (created
  // once below) without needing to rebuild that instance on every render.
  // Updated in an effect (commit phase), not during render.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      onResultRef.current(transcript, isFinal);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      // "no-speech" and "aborted" fire on routine stop/timeout, not real
      // failures - only worth logging anything unexpected.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.abort();
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // start() throws if recognition is already active - safe to ignore.
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isSupported, isListening, start, stop };
}
