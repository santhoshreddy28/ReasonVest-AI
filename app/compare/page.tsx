"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompanyCard from "@/components/CompanyCard";
import ComparisonCard from "@/components/ComparisonCard";
import CompanyNotFound from "@/components/CompanyNotFound";
import type { ResearchReport } from "@/types/analysis";
import type { CompanyNotFoundInfo } from "@/types/company";

interface CompareResponse {
  reportA: ResearchReport;
  reportB: ResearchReport;
  comparison: {
    verdict: string;
    revenueComparison: string;
    growthComparison: string;
    riskComparison: string;
    innovationComparison: string;
  };
}

export default function ComparePage() {
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [notFound, setNotFound] = useState<CompanyNotFoundInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCompare() {
    if (!nameA || !nameB) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setNotFound(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryA: nameA, queryB: nameB }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "COMPANY_NOT_FOUND") {
          setNotFound(data as CompanyNotFoundInfo);
          return;
        }
        throw new Error(data?.error ?? "Comparison failed");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  // The failed side is whichever input matches the not-found query - lets
  // "did you mean" clicks fix just that side and re-run the comparison
  // automatically instead of making the user retype both fields.
  function applySuggestion(ticker: string) {
    if (!notFound) return;
    const failedSide = notFound.query.trim().toLowerCase() === nameA.trim().toLowerCase() ? "A" : "B";
    if (failedSide === "A") setNameA(ticker);
    else setNameB(ticker);
    setNotFound(null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6 space-y-6 w-full flex-1">
        <h1 className="text-xl font-semibold text-white">Compare Companies</h1>

        <div className="flex flex-col md:flex-row gap-3 items-center">
          <input
            className="flex-1 w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white outline-none"
            placeholder="Company A (e.g. Microsoft)"
            value={nameA}
            onChange={(e) => setNameA(e.target.value)}
          />
          <span className="text-slate-500 text-sm">vs</span>
          <input
            className="flex-1 w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white outline-none"
            placeholder="Company B (e.g. Google)"
            value={nameB}
            onChange={(e) => setNameB(e.target.value)}
          />
          <button
            onClick={handleCompare}
            disabled={isLoading || !nameA || !nameB}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded-full text-sm whitespace-nowrap"
          >
            {isLoading ? "Comparing..." : "Compare"}
          </button>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        {notFound && (
          <CompanyNotFound
            query={notFound.query}
            suggestions={notFound.suggestions}
            subsidiary={notFound.subsidiary}
            onSelect={applySuggestion}
          />
        )}

        {result && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CompanyCard company={result.reportA.company} profile={result.reportA.profile} />
              <CompanyCard company={result.reportB.company} profile={result.reportB.profile} />
            </div>
            <ComparisonCard
              nameA={result.reportA.company.name}
              nameB={result.reportB.company.name}
              comparison={result.comparison}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
