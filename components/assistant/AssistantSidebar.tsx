"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  FiEdit3,
  FiEdit2,
  FiChevronsLeft,
  FiChevronsRight,
  FiTrash2,
  FiBarChart2,
  FiActivity,
  FiHome,
  FiX,
} from "react-icons/fi";
import { PiGhost } from "react-icons/pi";
import BrandMark from "@/components/BrandMark";
import { displayFont } from "@/lib/fonts";
import type { StoredConversation } from "@/types/chat";

interface AssistantSidebarProps {
  conversations: StoredConversation[];
  activeConversationId: string;
  incognito: boolean;
  collapsed: boolean;
  mobileOpen: boolean;
  onNewChat: () => void;
  onToggleIncognito: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  /** The most recently deleted conversation, if any - shows a brief
   *  "Deleted <title> - Undo" affordance until restored or dismissed. */
  lastDeleted: StoredConversation | null;
  onRestoreLastDeleted: () => void;
  onDismissLastDeleted: () => void;
}

interface RailItemProps {
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}

// One row in the rail: either a button (New chat, Incognito) or a Link
// (quick nav to other pages) - collapsed to icon-only with a title tooltip
// when the rail is collapsed, otherwise icon + label.
function RailItem({ icon, label, collapsed, active, onClick, href }: RailItemProps) {
  const className = `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 ${
    active
      ? "bg-brand-500/15 text-white"
      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
  } ${collapsed ? "justify-center" : ""}`;

  const content = (
    <>
      <span className="flex-shrink-0 text-[16px]">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} title={collapsed ? label : undefined} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-pressed={active}
      className={className}
    >
      {content}
    </button>
  );
}

interface ConversationRowProps {
  conversation: StoredConversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

// A single "Recent" entry. The title itself is a real <button> (not a div
// with an onClick) so it's keyboard-focusable and reads correctly to a
// screen reader; rename/delete are sibling buttons rather than nested
// inside it, since a <button> can't validly contain other buttons.
function ConversationRow({ conversation, isActive, onSelect, onDelete, onRename }: ConversationRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  function startEditing() {
    setDraftTitle(conversation.title);
    setIsEditing(true);
  }

  function commit() {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== conversation.title) onRename(trimmed);
    setIsEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
        <input
          ref={inputRef}
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          aria-label="Conversation name"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-lg text-[13px] transition-colors ${
        isActive ? "bg-brand-500/15 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 truncate rounded-lg px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50"
      >
        {conversation.title}
      </button>
      <button
        type="button"
        onClick={startEditing}
        aria-label={`Rename "${conversation.title}"`}
        className="flex-shrink-0 rounded p-1 text-slate-600 opacity-0 outline-none transition-opacity hover:text-slate-300 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand-400/50"
      >
        <FiEdit2 size={12} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete "${conversation.title}"`}
        className="mr-1 flex-shrink-0 rounded p-1 text-slate-600 opacity-0 outline-none transition-opacity hover:text-red-400 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand-400/50"
      >
        <FiTrash2 size={12} />
      </button>
    </div>
  );
}

export default function AssistantSidebar({
  conversations,
  activeConversationId,
  incognito,
  collapsed,
  mobileOpen,
  onNewChat,
  onToggleIncognito,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onToggleCollapsed,
  onCloseMobile,
  lastDeleted,
  onRestoreLastDeleted,
  onDismissLastDeleted,
}: AssistantSidebarProps) {
  // Lets keyboard/screen-reader users dismiss the mobile drawer without
  // hunting for the close button - the same escape hatch the backdrop
  // click gives mouse users.
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onCloseMobile();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  // The undo banner clears itself after a few seconds so it doesn't linger
  // as permanent clutter once the moment to undo has passed.
  useEffect(() => {
    if (!lastDeleted) return;
    const id = setTimeout(onDismissLastDeleted, 6000);
    return () => clearTimeout(id);
  }, [lastDeleted, onDismissLastDeleted]);

  return (
    <>
      {/* Mobile-only backdrop; the rail itself is always in the DOM (so
          desktop can persist collapsed/expanded) but slides off-screen on
          small viewports until opened. */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        aria-label="Assistant navigation"
        className={`fixed md:static inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0b0c11] transition-all duration-200 ease-out ${
          collapsed ? "md:w-[72px]" : "md:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex items-center gap-2 px-3 py-4">
          <Link href="/" aria-label="Back to ReasonVest" className="flex-shrink-0">
            <BrandMark size={30} />
          </Link>
          {!collapsed && (
            <span className={`${displayFont.className} truncate text-[15px] tracking-wide text-white/90`}>
              ReasonVest
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto hidden rounded-md p-1.5 text-slate-500 outline-none transition-colors hover:bg-white/5 hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-brand-400/50 md:flex"
          >
            {collapsed ? <FiChevronsRight size={16} /> : <FiChevronsLeft size={16} />}
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="ml-auto rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300 md:hidden"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1 px-2">
          <RailItem icon={<FiEdit3 />} label="New chat" collapsed={collapsed} onClick={onNewChat} />
          <RailItem
            icon={<PiGhost />}
            label="Incognito"
            collapsed={collapsed}
            active={incognito}
            onClick={onToggleIncognito}
          />
        </div>

        {!collapsed && (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2">
            <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-slate-600">
              Recent
            </p>
            {conversations.length === 0 ? (
              <p className="px-2.5 py-1.5 text-[13px] text-slate-600">
                {incognito ? "Incognito - this chat won't be saved." : "Your chats will show up here."}
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {conversations.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conversation={c}
                    isActive={c.id === activeConversationId && !incognito}
                    onSelect={() => onSelectConversation(c.id)}
                    onDelete={() => onDeleteConversation(c.id)}
                    onRename={(title) => onRenameConversation(c.id, title)}
                  />
                ))}
              </div>
            )}

            {lastDeleted && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-[12px] text-slate-400">
                <span className="min-w-0 truncate">Deleted &ldquo;{lastDeleted.title}&rdquo;</span>
                <button
                  type="button"
                  onClick={onRestoreLastDeleted}
                  className="flex-shrink-0 font-medium text-brand-300 outline-none hover:text-brand-200 focus-visible:ring-2 focus-visible:ring-brand-400/50"
                >
                  Undo
                </button>
              </div>
            )}
          </div>
        )}

        {collapsed && <div className="flex-1" />}

        <div className="flex flex-col gap-1 border-t border-white/[0.06] px-2 py-3">
          <RailItem icon={<FiBarChart2 />} label="Research" collapsed={collapsed} href="/dashboard" />
          <RailItem icon={<FiActivity />} label="Compare" collapsed={collapsed} href="/compare" />
          <RailItem icon={<FiHome />} label="ReasonVest home" collapsed={collapsed} href="/" />
        </div>
      </aside>
    </>
  );
}
