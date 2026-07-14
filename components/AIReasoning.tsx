"use client";
import ReactMarkdown from "react-markdown";
import type { AIAnalysis } from "@/types/analysis";

export default function AIReasoning({ analysis }: { analysis: AIAnalysis }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-sm text-slate-300 space-y-4">
      <div>
        <h3 className="text-white font-semibold mb-1">AI Reasoning</h3>
        <ReactMarkdown>{analysis.summary}</ReactMarkdown>
      </div>
      <div>
        <h4 className="text-white font-semibold mb-1">News Impact</h4>
        <ReactMarkdown>{analysis.newsImpact}</ReactMarkdown>
      </div>
      <div>
        <h4 className="text-white font-semibold mb-1">Future Outlook</h4>
        <ReactMarkdown>{analysis.futureOutlook}</ReactMarkdown>
      </div>
    </div>
  );
}
