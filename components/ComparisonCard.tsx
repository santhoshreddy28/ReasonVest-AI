interface ComparisonResult {
  verdict: string;
  revenueComparison: string;
  growthComparison: string;
  riskComparison: string;
  innovationComparison: string;
}

export default function ComparisonCard({
  nameA,
  nameB,
  comparison,
}: {
  nameA: string;
  nameB: string;
  comparison: ComparisonResult;
}) {
  const rows: [string, string][] = [
    ["Revenue", comparison.revenueComparison],
    ["Growth", comparison.growthComparison],
    ["Risk", comparison.riskComparison],
    ["Innovation", comparison.innovationComparison],
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-1">
        {nameA} vs {nameB}
      </h3>
      <p className="text-blue-400 text-sm mb-4">{comparison.verdict}</p>
      <div className="space-y-3 text-sm">
        {rows.map(([label, text]) => (
          <div key={label}>
            <p className="text-slate-500">{label}</p>
            <p className="text-slate-300">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
