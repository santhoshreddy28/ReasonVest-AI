// A file, image, or document attached to a chat message. `data` is the raw
// base64 payload (no "data:mime;base64," prefix) sent to the Gemini API as
// an inline_data part. `previewUrl` is a client-only object URL used to
// render an image thumbnail and is never sent to the server.
export interface ChatAttachment {
  name: string;
  mimeType: string;
  data: string;
  previewUrl?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
}

/**
 * A saved assistant conversation, persisted client-side (see
 * `lib/hooks/useConversationHistory.ts`). There's no auth or database wired
 * up for the assistant yet, so this intentionally lives in the browser
 * rather than reaching for a `userId`-keyed collection that doesn't have a
 * signed-in user to key off of - see that hook's file comment for the
 * fuller trade-off.
 */
export interface StoredConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}
