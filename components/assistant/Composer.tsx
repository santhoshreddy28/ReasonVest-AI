"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { FiPaperclip, FiSend, FiMic, FiX, FiFileText, FiVolume2, FiVolumeX } from "react-icons/fi";
import type { ChatAttachment } from "@/types/chat";
import {
  ACCEPTED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/constants";
import { fileToBase64 } from "@/lib/helpers";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";

interface ComposerProps {
  onSend: (text: string, attachments: ChatAttachment[]) => void;
  isLoading: boolean;
  placeholder?: string;
  /**
   * When both of these are provided, a "voice mode" toggle renders next to
   * the mic - reads assistant replies aloud when on. Left undefined by
   * callers that already surface this control elsewhere (the embedded
   * dashboard/report chat keeps it in its own header, unchanged) so it
   * only shows up once per screen.
   */
  voiceReplyEnabled?: boolean;
  onToggleVoiceReply?: () => void;
}

export default function Composer({
  onSend,
  isLoading,
  placeholder,
  voiceReplyEnabled,
  onToggleVoiceReply,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Whatever was in the box before the current voice-input turn started, so
  // interim speech results can be appended without clobbering text the user
  // already typed. This affects what's rendered, so it's state, not a ref.
  const [baseText, setBaseText] = useState("");

  const { isSupported: voiceInputSupported, isListening, start, stop } = useSpeechRecognition(
    (transcript, isFinal) => {
      if (isFinal) {
        const combined = `${baseText}${baseText ? " " : ""}${transcript}`.trim();
        setText(combined);
        setBaseText(combined);
        setInterimTranscript("");
      } else {
        setInterimTranscript(transcript);
      }
    }
  );

  const displayValue =
    isListening && interimTranscript
      ? `${baseText}${baseText ? " " : ""}${interimTranscript}`
      : text;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [displayValue]);

  function handleMicClick() {
    if (isListening) {
      stop();
      return;
    }
    setBaseText(text);
    setInterimTranscript("");
    start();
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setAttachError(null);

    const room = MAX_ATTACHMENTS_PER_MESSAGE - attachments.length;
    if (room <= 0) {
      setAttachError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
      return;
    }

    const files = Array.from(fileList).slice(0, room);
    const next: ChatAttachment[] = [];
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setAttachError(`"${file.name}" is over the 10MB limit.`);
        continue;
      }
      try {
        const data = await fileToBase64(file);
        next.push({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          data,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        });
      } catch {
        setAttachError(`Couldn't read "${file.name}".`);
      }
    }
    setAttachments((prev) => [...prev, ...next]);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSend() {
    const value = text.trim();
    if (!value && attachments.length === 0) return;
    if (isListening) stop();
    onSend(value, attachments);
    setText("");
    setAttachments([]);
    setInterimTranscript("");
    setBaseText("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="w-full">
      {attachError && <p className="text-xs text-red-400 mb-2 px-1">{attachError}</p>}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              {att.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className="w-14 h-14 object-cover rounded-lg border border-white/10"
                />
              ) : (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-slate-300 max-w-[140px]">
                  <FiFileText size={14} className="flex-shrink-0" />
                  <span className="truncate">{att.name}</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                aria-label={`Remove ${att.name}`}
                className="absolute -top-1.5 -right-1.5 bg-slate-800 border border-white/20 rounded-full p-0.5 text-slate-300 hover:text-white transition-colors"
              >
                <FiX size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isListening && (
        <p className="text-xs text-brand-300 mb-1.5 px-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Listening…
        </p>
      )}

      <div className="flex items-end gap-1 bg-white/5 border border-white/10 rounded-3xl px-2 py-2 focus-within:border-brand-400/40 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_ATTACHMENT_TYPES}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
          aria-label="Attach files, images, or documents"
          className="flex-shrink-0 p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <FiPaperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={displayValue}
          onChange={(e) => {
            setText(e.target.value);
            setBaseText(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Message ReasonVest Assistant…"}
          aria-label={placeholder ?? "Message ReasonVest Assistant"}
          disabled={isLoading}
          className="flex-1 min-w-0 bg-transparent outline-none resize-none text-[15px] text-white placeholder:text-slate-500 py-2 max-h-40"
        />

        {onToggleVoiceReply && (
          <button
            type="button"
            onClick={onToggleVoiceReply}
            aria-pressed={voiceReplyEnabled}
            title="Have the assistant read its replies aloud"
            className={`flex-shrink-0 p-2.5 rounded-full transition-colors ${
              voiceReplyEnabled ? "text-brand-300 bg-brand-500/15" : "text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {voiceReplyEnabled ? <FiVolume2 size={18} /> : <FiVolumeX size={18} />}
          </button>
        )}

        {voiceInputSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isLoading}
            aria-label={isListening ? "Stop voice input" : "Speak your message"}
            aria-pressed={isListening}
            className={`flex-shrink-0 p-2.5 rounded-full transition-colors disabled:opacity-40 ${
              isListening
                ? "bg-brand-500/20 text-brand-300 animate-pulse"
                : "text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <FiMic size={18} />
          </button>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || (!text.trim() && attachments.length === 0)}
          aria-label="Send message"
          className="flex-shrink-0 p-2.5 rounded-full bg-brand-500 hover:bg-brand-600 disabled:bg-white/10 disabled:text-slate-500 text-white transition-colors"
        >
          <FiSend size={16} />
        </button>
      </div>
    </div>
  );
}
