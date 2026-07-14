"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiVolume2,
  FiVolumeX,
  FiPlus,
  FiBookOpen,
  FiTrendingUp,
  FiPieChart,
  FiColumns,
} from "react-icons/fi";
import { PiGhost } from "react-icons/pi";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import BrandMark from "@/components/BrandMark";
import { displayFont } from "@/lib/fonts";
import type { ChatAttachment, ChatMessage } from "@/types/chat";
import type { ResearchReport } from "@/types/analysis";
import { useSpeechSynthesis } from "@/lib/hooks/useSpeechSynthesis";
import { stripMarkdownForSpeech } from "@/lib/helpers";

interface AssistantChatProps {
  // "report" grounds every answer in an already-generated research report
  // (via /api/chat). "general" is a free-ranging assistant with its own
  // running conversation memory (via /api/assistant).
  mode: "general" | "report";
  report?: ResearchReport;
  title?: string;
  subtitle?: string;
  suggestions?: string[];
  // Shrinks the empty-state hero, used when embedding inside a card
  // (dashboard) instead of giving the assistant a full page.
  compact?: boolean;
  /**
   * Visual treatment. "embedded" (the default) is the original compact-card
   * look used inside the dashboard/report follow-up chat - unchanged so
   * those flows stay pixel-for-pixel as they were. "full" is the
   * Claude/Perplexity-style full-page hero treatment used by /assistant:
   * a bigger brand moment on the empty state, icon-only header controls,
   * and pill-style starter prompts instead of a two-column grid.
   */
  variant?: "embedded" | "full";
  /**
   * Seeds the thread - used by the /assistant page to resume a saved
   * conversation or start a blank one. Only meaningful for mode="general";
   * report mode always starts empty. The page remounts this component (via
   * a `key` change) when switching threads, so this only needs to matter
   * on mount, not react to later prop changes.
   */
  initialMessages?: ChatMessage[];
  /**
   * True while this thread is running in incognito. Purely a display flag
   * in here (shows a small "won't be saved" badge on the empty state) -
   * the actual decision not to persist lives in the parent, which simply
   * won't call its history hook while this is true.
   */
  incognito?: boolean;
  /**
   * Fired whenever the message list changes after the initial mount, so a
   * parent (the /assistant page) can save it to conversation history.
   * Not used by report/embedded callers, which have no history of their own.
   */
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

const DEFAULT_SUGGESTIONS = [
  "What's a P/E ratio, in plain English?",
  "How should a beginner start investing?",
  "What does “diversification” actually mean?",
  "Explain bull vs. bear markets",
];

// Starter prompts for the full-page hero, each paired with an icon so they
// read as Perplexity/Claude-style pills rather than a plain suggestions
// grid. Still just calls send(question) under the hood - same mechanism
// DEFAULT_SUGGESTIONS uses, just presented differently for this variant.
const FULL_VARIANT_PROMPTS = [
  { icon: FiBookOpen, label: "Learn", question: "Explain what a P/E ratio means, in plain English." },
  { icon: FiTrendingUp, label: "Markets", question: "What's moving the markets today?" },
  { icon: FiPieChart, label: "Portfolio", question: "How should a beginner think about diversification?" },
  { icon: FiColumns, label: "Compare", question: "How do I compare two stocks against each other?" },
] as const;

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up?";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function AssistantChat({
  mode,
  report,
  title = "ReasonVest Assistant",
  subtitle = "Ask about investing concepts, markets, or attach a chart or document.",
  suggestions,
  compact = false,
  variant = "embedded",
  initialMessages,
  incognito = false,
  onMessagesChange,
}: AssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isSupported: speechSupported, isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis();

  // Messages at or past this index arrived live during this mount; ones
  // before it were seeded from resumed history and should render instantly
  // rather than replay the typing animation every time a saved chat opens.
  // A plain value (not a ref) - `initialMessages` itself doesn't change
  // across this instance's renders (the parent remounts via a `key` change
  // instead of swapping it), so this is already stable without one.
  const seededCount = initialMessages?.length ?? 0;

  const activeSuggestions = suggestions ?? DEFAULT_SUGGESTIONS;
  const isFull = variant === "full";

  // Keeps the latest callback reachable from the effect below without
  // needing it in that effect's dependency array - same "ref mirrors the
  // latest callback" pattern already used in useSpeechRecognition.ts, kept
  // consistent here rather than inventing a second style.
  const onMessagesChangeRef = useRef(onMessagesChange);
  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  });

  // Reports message-list changes upward for persistence, but skips the
  // very first run - otherwise simply opening a resumed conversation would
  // immediately "re-save" it and bump its position in the sidebar, when
  // nothing has actually changed yet.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    onMessagesChangeRef.current?.(messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  // The synthesis hook only tracks global isSpeaking, so derive which
  // message bubble is "active" instead of syncing a second piece of state.
  const activeSpeakingIndex = isSpeaking ? speakingIndex : null;

  const speakMessage = useCallback(
    (index: number, text: string) => {
      setSpeakingIndex(index);
      speak(stripMarkdownForSpeech(text));
    },
    [speak]
  );

  async function send(question: string, attachments: ChatAttachment[] = []) {
    if (!question.trim() && attachments.length === 0) return;

    const userMessage: ChatMessage = { role: "user", content: question, attachments };
    const historyBeforeThisTurn = messages;
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const attachmentPayload = attachments.map((a) => ({ mimeType: a.mimeType, data: a.data }));

    try {
      let answer: string;

      if (mode === "report" && report) {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report, question, attachments: attachmentPayload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
        answer = data.answer;
      } else {
        const history = historyBeforeThisTurn.map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("model" as const),
          text: m.content,
        }));
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question, history, attachments: attachmentPayload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
        answer = data.answer;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      if (voiceReplyEnabled) {
        // The new assistant message lands right after this turn's user
        // message, whatever index that ends up at.
        speakMessage(historyBeforeThisTurn.length + 1, answer);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong reaching the AI.";
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewChat() {
    stopSpeaking();
    setMessages([]);
  }

  function handleToggleVoiceReply() {
    if (voiceReplyEnabled) stopSpeaking();
    setVoiceReplyEnabled((v) => !v);
  }

  const showEmptyState = messages.length === 0;

  return (
    <div className={`flex flex-col ${compact ? "h-[560px]" : "h-full"} min-h-0`}>
      {!isFull && (
        <div className="flex items-center justify-between gap-3 px-1 pb-4">
          <div className="min-w-0">
            <h2 className="text-white font-semibold truncate">{title}</h2>
            {!compact && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {speechSupported && (
              <button
                onClick={handleToggleVoiceReply}
                aria-pressed={voiceReplyEnabled}
                title="Have the assistant read its replies aloud"
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  voiceReplyEnabled
                    ? "bg-brand-500/15 border-brand-400/30 text-brand-300"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {voiceReplyEnabled ? <FiVolume2 size={13} /> : <FiVolumeX size={13} />}
                <span className="hidden sm:inline">Voice replies {voiceReplyEnabled ? "on" : "off"}</span>
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <FiPlus size={13} /> New chat
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 px-1">
        {showEmptyState ? (
          <div
            className={`relative flex flex-col items-center justify-center text-center gap-6 ${
              compact ? "h-full" : "h-full min-h-[40vh]"
            }`}
          >
            {isFull && <div className="assistant-glow" aria-hidden="true" />}
            {isFull ? (
              <div className="relative flex flex-col items-center gap-4">
                <BrandMark size={56} />
                <h1
                  className={`${displayFont.className} text-4xl sm:text-5xl font-medium tracking-tight text-white/90`}
                >
                  {timeOfDayGreeting()}
                </h1>
                <p className="max-w-sm text-sm text-slate-500">{subtitle}</p>
              </div>
            ) : (
              !compact && (
                <div>
                  <h3 className="text-2xl font-medium bg-gradient-to-r from-brand-300 via-slate-100 to-brand-400 bg-clip-text text-transparent">
                    {mode === "report" ? "Ask about this report" : "Hi, I'm your ReasonVest Assistant"}
                  </h3>
                  <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">{subtitle}</p>
                </div>
              )
            )}
            {!isFull && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {activeSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`space-y-5 py-2 mx-auto w-full ${isFull ? "max-w-3xl" : "max-w-2xl"}`}
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                index={i}
                message={m}
                isSpeaking={activeSpeakingIndex === i}
                speakEnabled={speechSupported}
                onSpeak={speakMessage}
                onStopSpeak={stopSpeaking}
                animate={m.role === "assistant" && i >= seededCount}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 flex-shrink-0">
                  <BrandMark size={28} />
                </div>
                <div className="flex items-center gap-1 pt-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className={`pt-4 mx-auto w-full px-1 ${isFull ? "max-w-3xl" : "max-w-2xl"}`}>
        {isFull && incognito && (
          <div className="mb-2.5 flex items-center justify-center gap-1.5 text-xs text-brand-300">
            <PiGhost size={13} /> Incognito - this chat won&apos;t be saved
          </div>
        )}
        <Composer
          onSend={send}
          isLoading={isLoading}
          placeholder={mode === "report" ? "Ask about this report…" : "Message ReasonVest Assistant…"}
          voiceReplyEnabled={isFull && speechSupported ? voiceReplyEnabled : undefined}
          onToggleVoiceReply={isFull && speechSupported ? handleToggleVoiceReply : undefined}
        />
        {isFull && showEmptyState && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {FULL_VARIANT_PROMPTS.map(({ icon: Icon, label, question }) => (
              <button
                key={label}
                onClick={() => send(question)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
              >
                <Icon size={14} className="text-brand-400" /> {label}
              </button>
            ))}
          </div>
        )}
        {!compact && (
          <p className="text-[11px] text-slate-600 text-center mt-2.5">
            Not financial advice. Verify important decisions with the full research report or a
            licensed advisor.
          </p>
        )}
      </div>
    </div>
  );
}
