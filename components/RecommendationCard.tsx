import type { AIAnalysis } from "@/types/analysis";

const STYLES: Record<AIAnalysis["recommendation"], string> = {
  BUY: "text-green-400 border-green-500/40",
  HOLD: "text-yellow-400 border-yellow-500/40",
  SELL: "text-red-400 border-red-500/40",
};

export default function RecommendationCard({ analysis }: { analysis: AIAnalysis }) {
  return (
    <div
      className={`bg-white/5 border-2 rounded-xl p-6 text-center ${STYLES[analysis.recommendation]}`}
    >
      <h2 className="text-4xl font-bold">{analysis.recommendation}</h2>
      <p className="text-slate-300 mt-2">Confidence: {analysis.confidence}%</p>
      <p className="text-slate-400 text-sm mt-3">{analysis.verdict}</p>
    </div>
  );
}
