"use client";
import { TRENDING_COMPANIES } from "@/lib/constants";

export default function TrendingCompanies({ onSelect }: { onSelect: (name: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-6">
      {TRENDING_COMPANIES.map((name) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className="text-sm px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/30 transition-colors"
        >
          {name}
        </button>
      ))}
    </div>
  );
}
