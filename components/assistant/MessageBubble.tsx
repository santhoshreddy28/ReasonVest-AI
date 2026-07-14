"use client";
import { memo, useState } from "react";
import { FiCopy, FiCheck, FiVolume2, FiSquare, FiFileText } from "react-icons/fi";
import AssistantMarkdown from "./AssistantMarkdown";
import BrandMark from "@/components/BrandMark";
import { useTypewriter } from "@/lib/hooks/useTypewriter";
import type { ChatAttachment, ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  index: number;
  isSpeaking: boolean;
  speakEnabled: boolean;
  // Stable (useCallback'd, index-based) rather than a fresh closure built
  // per row in the parent's .map() - lets memo() below actually skip
  // re-rendering older messages when unrelated state (isLoading, etc.)
  // changes the parent.
  onSpeak: (index: number, text: string) => void;
  onStopSpeak: () => void;
  // True only for a message that arrived live during this mount (not one
  // seeded from resumed history) - gates the typing animation so opening
  // a saved conversation renders instantly instead of replaying it.
  animate: boolean;
}

function AttachmentThumb({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.previewUrl}
        alt={attachment.name}
        className="w-16 h-16 object-cover rounded-lg border border-white/10"
      />
    );
  }
  return (
    <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 max-w-[160px]">
      <FiFileText size={14} className="flex-shrink-0" />
      <span className="truncate">{attachment.name}</span>
    </div>
  );
}

function MessageBubble({
  message,
  index,
  isSpeaking,
  speakEnabled,
  onSpeak,
  onStopSpeak,
  animate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const displayedContent = useTypewriter(message.content, animate);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied - not worth surfacing an error for.
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2 flex flex-col items-end">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((att, i) => (
                <AttachmentThumb key={i} attachment={att} />
              ))}
            </div>
          )}
          {message.content && (
            <div className="bg-brand-500/15 border border-brand-400/20 text-slate-100 rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group">
      <div className="w-7 h-7 flex-shrink-0 mt-0.5">
        <BrandMark size={28} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] text-slate-200">
          <AssistantMarkdown content={displayedContent} />
        </div>
        <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            aria-label="Copy response"
            className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
          </button>
          {speakEnabled && (
            <button
              onClick={() => (isSpeaking ? onStopSpeak() : onSpeak(index, message.content))}
              aria-label={isSpeaking ? "Stop reading aloud" : "Read aloud"}
              className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {isSpeaking ? <FiSquare size={14} /> : <FiVolume2 size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(MessageBubble);
