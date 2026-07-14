"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingTimeline from "@/components/LoadingTimeline";
import CompanyCard from "@/components/CompanyCard";
import CompanyNotFound from "@/components/CompanyNotFound";
import type { CompanyNotFoundInfo } from "@/types/company";
import RecommendationCard from "@/components/RecommendationCard";
import ScoreGauge from "@/components/ScoreGauge";
import FinancialCard from "@/components/FinancialCard";
import NewsCard from "@/components/NewsCard";
import RiskCard from "@/components/RiskCard";
import OpportunityCard from "@/components/OpportunityCard";
import BullCaseCard from "@/components/BullCaseCard";
import BearCaseCard from "@/components/BearCaseCard";
import AIReasoning from "@/components/AIReasoning";
import ChatSection from "@/components/ChatSection";
import { FinancialBarChart, SignalRadarChart } from "@/components/Charts";
import type { ResearchReport } from "@/types/analysis";

// Next.js requires useSearchParams() to be wrapped in a Suspense boundary so
// the page can still be prerendered - the actual logic lives in
// DashboardContent, and this default export just adds that boundary.
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("company") ?? "";

  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [notFound, setNotFound] = useState<CompanyNotFoundInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;

    // Purely cosmetic step advancement while the real request is in flight -
    // the pipeline itself doesn't stream progress back, so this just gives
    // the user something to watch rather than a blank spinner.
    const stepTimer = setInterval(() => {
      setStep((s) => (s < 4 ? s + 1 : s));
    }, 900);

    async function run() {
      setIsLoading(true);
      setStep(0);
      setError(null);
      setNotFound(null);
      setReport(null);
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        if (!res.ok) {
          // COMPANY_NOT_FOUND is an expected outcome, not a failure - the
          // API always answers with something actionable (suggestions
          // and/or a subsidiary note) instead of a bare message, so route
          // it to its own state rather than the generic error banner.
          if (data?.code === "COMPANY_NOT_FOUND") {
            if (!cancelled) setNotFound(data as CompanyNotFoundInfo);
            return;
          }
          throw new Error(data?.error ?? "Analysis failed");
        }
        if (!cancelled) {
          setStep(5);
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!cancelled) setIsLoading(false);
        clearInterval(stepTimer);
      }
    }

    run();
    return () => {
      cancelled = true;
      clearInterval(stepTimer);
    };
  }, [query]);

  function searchAgain(nextQuery: string) {
    router.push(`/dashboard?company=${encodeURIComponent(nextQuery)}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6 space-y-6 w-full flex-1">
        <h1 className="text-xl font-semibold text-white">Research: {query}</h1>

        {isLoading && (
          <div className="py-12">
            <LoadingTimeline currentStep={step} />
          </div>
        )}

        {error && <p className="text-red-400">{error}</p>}

        {notFound && !isLoading && (
          <CompanyNotFound
            query={notFound.query}
            suggestions={notFound.suggestions}
            subsidiary={notFound.subsidiary}
            onSelect={searchAgain}
          />
        )}

        {report && !isLoading && (
          <>
            <CompanyCard company={report.company} profile={report.profile} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <RecommendationCard analysis={report.analysis} />
              <ScoreGauge score={report.analysis.investmentScore} />
            </div>

            <FinancialCard finance={report.finance} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3">Financial Metrics</h3>
                <FinancialBarChart finance={report.finance} />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3">Signal Profile</h3>
                <SignalRadarChart analysis={report.analysis} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BullCaseCard bullCase={report.analysis.bullCase} />
              <BearCaseCard bearCase={report.analysis.bearCase} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <OpportunityCard opportunities={report.analysis.opportunities} />
              <RiskCard risks={report.analysis.risks} />
            </div>

            <AIReasoning analysis={report.analysis} />
            <NewsCard news={report.news} />
            <ChatSection report={report} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
