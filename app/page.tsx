"use client";
import { useRouter } from "next/navigation";
import { FiActivity, FiCpu, FiFileText, FiEye } from "react-icons/fi";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SearchBox from "@/components/SearchBox";
import TrendingCompanies from "@/components/TrendingCompanies";
import FeatureCard from "@/components/FeatureCard";
import Footer from "@/components/Footer";

const FEATURES = [
  {
    icon: FiActivity,
    title: "Live Data",
    description: "Real company profiles, financials, and news pulled live for every search.",
  },
  {
    icon: FiCpu,
    title: "AI Research",
    description: "Gemini evaluates the evidence and produces a structured investment report.",
  },
  {
    icon: FiFileText,
    title: "News Intelligence",
    description: "Recent headlines are factored directly into the recommendation.",
  },
  {
    icon: FiEye,
    title: "Transparent Reasoning",
    description: "See the bull case, bear case, and risks behind every verdict.",
  },
];

export default function Home() {
  const router = useRouter();

  function handleSearch(query: string) {
    router.push(`/dashboard?company=${encodeURIComponent(query)}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Hero />

      <div className="px-4">
        <SearchBox onSearch={handleSearch} />
        <TrendingCompanies onSelect={handleSearch} />
      </div>

      <section
        id="features"
        className="max-w-5xl mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full"
      >
        {FEATURES.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </section>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
