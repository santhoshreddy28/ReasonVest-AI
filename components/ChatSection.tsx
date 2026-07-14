"use client";
import AssistantChat from "@/components/assistant/AssistantChat";
import type { ResearchReport } from "@/types/analysis";

const SUGGESTIONS = [
  "Explain for beginners",
  "Why this verdict?",
  "Biggest risks?",
  "What would change your mind?",
];

// Thin wrapper around the shared AssistantChat, grounded in this report.
// Kept as its own component (rather than inlining AssistantChat directly
// into the dashboard) so the dashboard page doesn't need to know about the
// assistant's internals.
export default function ChatSection({ report }: { report: ResearchReport }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <AssistantChat
        mode="report"
        report={report}
        title="Ask a Follow-up"
        subtitle="Ask about this report, or attach a chart or filing for more context."
        suggestions={SUGGESTIONS}
        compact
      />
    </div>
  );
}
