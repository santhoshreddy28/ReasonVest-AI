"use client";
import { useCallback, useState, useSyncExternalStore } from "react";

// speechSynthesis availability never changes mid-session, so it's modeled
// as an external store (server snapshot: unsupported, matching SSR) rather
// than state+effect - avoids a "setState in effect" pattern for a value
// that isn't really reacting to anything.
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
function getServerSnapshot() {
  return false;
}

// Wraps the browser's speechSynthesis API for reading assistant replies
// aloud. Supported in effectively every modern browser (unlike
// SpeechRecognition), but still feature-detected defensively.
export function useSpeechSynthesis() {
  const isSupported = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;

    // Cancel anything already playing so replies don't overlap.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { isSupported, isSpeaking, speak, stop };
}
