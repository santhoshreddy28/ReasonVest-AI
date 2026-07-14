export default function BullCaseCard({ bullCase }: { bullCase: string[] }) {
  return (
    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
      <h3 className="text-green-400 font-semibold mb-3">Bull Case</h3>
      <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
        {bullCase.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}
