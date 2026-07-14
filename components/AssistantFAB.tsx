"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";

// A persistent entry point to the AI assistant, visible from every page
// except the assistant page itself.
export default function AssistantFAB() {
  const pathname = usePathname();
  if (pathname === "/assistant") return null;

  return (
    <Link
      href="/assistant"
      aria-label="Open ReasonVest Assistant"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white pl-4 pr-5 py-3 rounded-full shadow-lg shadow-brand-500/20 transition-all hover:scale-105"
    >
      <BrandMark glyphOnly size={16} className="text-white" />
      <span className="text-sm font-medium">Ask AI</span>
    </Link>
  );
}
