"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiGithub, FiMessageCircle } from "react-icons/fi";
import { APP_NAME } from "@/lib/constants";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/30 border-b border-white/[0.06] sticky top-0 z-50">
      <Link href="/" className="font-bold text-lg tracking-tight text-white">
        {APP_NAME}
      </Link>
      <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#about" className="hover:text-white transition-colors">About</a>
        <Link
          href="/assistant"
          className={`flex items-center gap-1.5 transition-colors ${
            pathname === "/assistant" ? "text-white" : "hover:text-white"
          }`}
        >
          <FiMessageCircle /> Assistant
        </Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <FiGithub /> GitHub
        </a>
      </div>
    </nav>
  );
}
