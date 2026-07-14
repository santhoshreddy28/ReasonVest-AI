"use client";
import { motion } from "framer-motion";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="relative text-center pt-28 pb-16 px-4 overflow-hidden">
      <div className="ambient-glow" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative inline-flex items-center gap-2 text-xs font-medium tracking-wide text-blue-300/80 bg-blue-500/10 border border-blue-400/20 rounded-full px-3 py-1 mb-6"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        AI-powered equity research
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative text-4xl md:text-6xl font-semibold text-white tracking-tight text-balance"
      >
        {APP_NAME}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative mt-4 text-lg text-slate-400 max-w-lg mx-auto"
      >
        {APP_TAGLINE}
      </motion.p>
    </section>
  );
}
