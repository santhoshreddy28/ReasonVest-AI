"use client";
import { motion } from "framer-motion";
import { FiSearch, FiCornerDownRight } from "react-icons/fi";
import type { Company } from "@/types/company";

interface CompanyNotFoundProps {
  query: string;
  suggestions: Company[];
  subsidiary: { parentName: string; parentTicker: string | null; note: string } | null;
  onSelect: (query: string) => void;
}

/**
 * Rendered instead of a bare error whenever a search doesn't confidently
 * resolve to a public company. Always gives the user a next step: either a
 * one-click suggestion list of near matches, a subsidiary/brand note
 * pointing at the actual public parent, or both.
 */
export default function CompanyNotFound({ query, suggestions, subsidiary, onSelect }: CompanyNotFoundProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 p-2 text-blue-400">
          <FiSearch />
        </div>
        <div>
          <h2 className="text-white font-semibold text-lg">
            No public stock found for &ldquo;{query}&rdquo;
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {suggestions.length > 0
              ? "It doesn't look like this is a listed ticker or company name we could confirm. Here's what's closest:"
              : "We couldn't find a listed ticker or company name that matches this. It may not be publicly traded, or the name may need adjusting."}
          </p>
        </div>
      </div>

      {subsidiary && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-200">
            <span className="font-medium">{query}</span> appears to be owned by{" "}
            <span className="font-medium">{subsidiary.parentName}</span>
            {subsidiary.parentTicker ? ` (${subsidiary.parentTicker})` : ""}. {subsidiary.note}
          </p>
          {subsidiary.parentTicker && (
            <button
              onClick={() => onSelect(subsidiary.parentTicker as string)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-300 hover:text-amber-200 transition-colors"
            >
              <FiCornerDownRight /> Research {subsidiary.parentName} instead
            </button>
          )}
          <p className="text-xs text-amber-200/60 mt-2">
            Investing in the parent company means exposure to this brand&apos;s performance alongside its
            other businesses - not a direct stake in {query} on its own.
          </p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Did you mean</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map((s) => (
              <button
                key={s.ticker}
                onClick={() => onSelect(s.ticker)}
                className="flex items-center justify-between gap-2 text-left px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-blue-400/40 hover:bg-white/10 transition-colors"
              >
                <span className="text-sm text-white truncate">{s.name}</span>
                <span className="text-xs text-slate-400 shrink-0">{s.ticker}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
