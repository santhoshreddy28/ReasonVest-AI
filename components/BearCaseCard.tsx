export default function BearCaseCard({ bearCase }: { bearCase: string[] }) {
  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
      <h3 className="text-red-400 font-semibold mb-3">Bear Case</h3>
      <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
        {bearCase.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}
