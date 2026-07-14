import { FiTrendingUp } from "react-icons/fi";

export default function OpportunityCard({ opportunities }: { opportunities: string[] }) {
  return (
    <div className="bg-white/5 border border-green-500/20 rounded-xl p-5">
      <h3 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
        <FiTrendingUp /> Opportunities
      </h3>
      <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
        {opportunities.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>
    </div>
  );
}
