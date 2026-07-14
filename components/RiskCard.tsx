import { FiAlertTriangle } from "react-icons/fi";

export default function RiskCard({ risks }: { risks: string[] }) {
  return (
    <div className="bg-white/5 border border-red-500/20 rounded-xl p-5">
      <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
        <FiAlertTriangle /> Risks
      </h3>
      <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
        {risks.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
