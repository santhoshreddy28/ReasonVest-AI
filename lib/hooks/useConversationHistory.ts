"use client";
import { useCallback, useState, useSyncExternalStore } from "react";
import type { ChatMessage, StoredConversation } from "@/types/chat";

const STORAGE_KEY = "reasonvest:assistant:conversations:v1";
const MAX_CONVERSATIONS = 30;
const TITLE_MAX_LENGTH = 40;

// In-memory mirror of localStorage, module-scoped rather than component
// state - lets every call site (and useSyncExternalStore itself) read a
// stable snapshot without re-parsing JSON on every render, and lets
// mutations from one place (saveConversation) notify every subscriber.
let cached: StoredConversation[] | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): StoredConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredConversation[]) : [];
  } catch {
    // Corrupted JSON, disabled storage, or a private-browsing quota error -
    // none of these should break the assistant, just mean no history today.
    return [];
  }
}

function writeToStorage(conversations: StoredConversation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Quota exceeded or storage disabled - the conversation still works for
    // this session, it just won't survive a refresh. Not worth surfacing.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Lazily seeds the in-memory mirror from localStorage on first read (so
// SSR/first paint never touches window), then serves that same reference
// until setConversations() below replaces it - the stable-reference
// requirement useSyncExternalStore needs to avoid re-render loops.
function getSnapshot(): StoredConversation[] {
  if (cached === null) cached = readFromStorage();
  return cached;
}

function getServerSnapshot(): StoredConversation[] {
  return [];
}

function setConversations(next: StoredConversation[]) {
  cached = next;
  writeToStorage(next);
  listeners.forEach((listener) => listener());
}

function titleFrom(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user" && m.content.trim());
  const text = firstUserMessage?.content.trim() ?? "New chat";
  return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH).trimEnd()}…` : text;
}

/**
 * Client-side conversation history for the AI Assistant.
 *
 * WHY localStorage instead of the `conversations` MongoDB collection a
 * signed-in version of this would use: there's no auth system in this app
 * yet (see the redesign brief's own open question on Google sign-in), and
 * a `userId`-keyed Mongo collection has nothing to key off of without one.
 * This hook gives "recent chats" and a genuinely functional incognito mode
 * *today*, entirely client-side, and is the natural seam to swap for a
 * `/api/conversations` + Mongo-backed version later - the shape
 * (`StoredConversation`) already matches what that collection's documents
 * would look like minus `userId`.
 */
export function useConversationHistory() {
  const conversations = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // The most recently deleted conversation, kept around just long enough
  // for an "Undo" affordance - ephemeral UI state, not persisted, so a
  // plain useState (rather than the external store above) is the right
  // tool: it doesn't need to survive a refresh or be shared across hook
  // instances.
  const [lastDeleted, setLastDeleted] = useState<StoredConversation | null>(null);

  const saveConversation = useCallback((id: string, messages: ChatMessage[]) => {
    const prev = getSnapshot();
    const existing = prev.find((c) => c.id === id);
    const next: StoredConversation = {
      id,
      // Title is set once from the first exchange (or by an explicit
      // rename) and kept stable after that, rather than recomputed on
      // every message - matches how the sidebar list is meant to read (a
      // fixed label per thread, not one that shifts as the conversation
      // goes on).
      title: existing?.title ?? titleFrom(messages),
      messages,
      updatedAt: Date.now(),
    };
    const withoutThis = prev.filter((c) => c.id !== id);
    const updated = [next, ...withoutThis]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CONVERSATIONS);
    setConversations(updated);
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setConversations(
      getSnapshot().map((c) => (c.id === id ? { ...c, title: trimmed } : c))
    );
  }, []);

  const deleteConversation = useCallback((id: string) => {
    const target = getSnapshot().find((c) => c.id === id);
    setConversations(getSnapshot().filter((c) => c.id !== id));
    setLastDeleted(target ?? null);
  }, []);

  // Undoes the most recent delete - a no-op past the first call (once
  // restored, or once dismissed, there's nothing left to restore).
  const restoreLastDeleted = useCallback(() => {
    setLastDeleted((pending) => {
      if (!pending) return null;
      const prev = getSnapshot();
      if (!prev.some((c) => c.id === pending.id)) {
        setConversations(
          [pending, ...prev].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS)
        );
      }
      return null;
    });
  }, []);

  const dismissLastDeleted = useCallback(() => setLastDeleted(null), []);

  const clearAll = useCallback(() => {
    setConversations([]);
  }, []);

  return {
    conversations,
    saveConversation,
    renameConversation,
    deleteConversation,
    lastDeleted,
    restoreLastDeleted,
    dismissLastDeleted,
    clearAll,
  };
}
