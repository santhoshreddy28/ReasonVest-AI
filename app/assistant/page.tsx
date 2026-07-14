"use client";
import { useState } from "react";
import { FiMenu } from "react-icons/fi";
import { PiGhost } from "react-icons/pi";
import AssistantChat from "@/components/assistant/AssistantChat";
import AssistantSidebar from "@/components/assistant/AssistantSidebar";
import { useConversationHistory } from "@/lib/hooks/useConversationHistory";
import type { ChatMessage } from "@/types/chat";

export default function AssistantPage() {
  const {
    conversations,
    saveConversation,
    renameConversation,
    deleteConversation,
    lastDeleted,
    restoreLastDeleted,
    dismissLastDeleted,
  } = useConversationHistory();

  // A fresh id for whatever thread is "current" - reused across messages
  // within that thread (so saves upsert the same entry) and replaced with
  // a new one whenever we start over (New chat / entering incognito /
  // switching threads). AssistantChat is remounted via `key={currentId}`
  // whenever this changes, which resets its internal message state without
  // needing any imperative reset plumbing.
  const [currentId, setCurrentId] = useState<string>(() => crypto.randomUUID());
  const [incognito, setIncognito] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeConversation = conversations.find((c) => c.id === currentId);

  function handleNewChat() {
    setCurrentId(crypto.randomUUID());
    setIncognito(false);
    setMobileOpen(false);
  }

  function handleToggleIncognito() {
    // Incognito is a mode you start a fresh thread into rather than flip
    // mid-conversation - otherwise it's ambiguous whether messages already
    // sent before the toggle count as "seen" by history.
    setCurrentId(crypto.randomUUID());
    setIncognito((v) => !v);
    setMobileOpen(false);
  }

  function handleSelectConversation(id: string) {
    setCurrentId(id);
    setIncognito(false);
    setMobileOpen(false);
  }

  function handleDeleteConversation(id: string) {
    deleteConversation(id);
    if (id === currentId) setCurrentId(crypto.randomUUID());
  }

  function handleMessagesChange(messages: ChatMessage[]) {
    if (incognito || messages.length === 0) return;
    saveConversation(currentId, messages);
  }

  return (
    <div data-assistant-scope className="h-screen flex overflow-hidden">
      <AssistantSidebar
        conversations={conversations}
        activeConversationId={currentId}
        incognito={incognito}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onNewChat={handleNewChat}
        onToggleIncognito={handleToggleIncognito}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={renameConversation}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        onCloseMobile={() => setMobileOpen(false)}
        lastDeleted={lastDeleted}
        onRestoreLastDeleted={restoreLastDeleted}
        onDismissLastDeleted={dismissLastDeleted}
      />

      <div className="flex-1 min-w-0 flex flex-col relative">
        <div className="flex items-center justify-between px-3 py-3 md:px-6 md:py-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
            className="rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300 md:hidden"
          >
            <FiMenu size={20} />
          </button>

          {/* Desktop-only breadcrumb - gives the slim header somewhere to
              anchor besides the incognito toggle, and shows which saved
              conversation (if any) is open. */}
          <div className="hidden min-w-0 items-center gap-1.5 text-sm text-slate-500 md:flex">
            <span className="text-slate-300">ReasonVest</span>
            <span aria-hidden="true">/</span>
            <span>Assistant</span>
            {activeConversation && (
              <>
                <span aria-hidden="true">/</span>
                <span className="max-w-[220px] truncate text-slate-300">{activeConversation.title}</span>
              </>
            )}
          </div>

          <div className="flex-1" />
          <button
            type="button"
            onClick={handleToggleIncognito}
            aria-pressed={incognito}
            aria-label={incognito ? "Exit incognito mode" : "Start an incognito chat"}
            title={incognito ? "Exit incognito mode" : "Start an incognito chat"}
            className={`rounded-full p-2 transition-colors ${
              incognito ? "bg-brand-500/15 text-brand-300" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            <PiGhost size={18} />
          </button>
        </div>

        <main className="flex-1 min-h-0 max-w-4xl w-full mx-auto px-4 md:px-6 pb-6 flex flex-col">
          <AssistantChat
            key={currentId}
            mode="general"
            variant="full"
            incognito={incognito}
            initialMessages={activeConversation?.messages ?? []}
            onMessagesChange={handleMessagesChange}
          />
        </main>
      </div>
    </div>
  );
}
