"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { FiSearch, FiArrowRight } from "react-icons/fi";

interface SearchBoxProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchBox({ onSearch, isLoading }: SearchBoxProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative max-w-xl mx-auto"
    >
      <div
        className={`flex items-center gap-3 bg-white/[0.04] border rounded-full pl-5 pr-2 py-2.5 backdrop-blur-md transition-colors ${
          focused ? "border-blue-400/50" : "border-white/10"
        }`}
      >
        <FiSearch className="text-slate-500 shrink-0" size={18} />
        <input
          className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-500 text-[15px]"
          placeholder="Enter a company name or ticker (e.g. Tesla, AAPL)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && value && onSearch(value)}
        />
        <button
          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:hover:bg-blue-500 text-white pl-4 pr-3.5 py-2 rounded-full text-sm font-medium transition-colors shrink-0"
          onClick={() => onSearch(value)}
          disabled={isLoading || !value}
        >
          {isLoading ? "Analyzing" : "Research"}
          {!isLoading && <FiArrowRight size={15} />}
        </button>
      </div>
    </motion.div>
  );
}
