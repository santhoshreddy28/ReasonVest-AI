"use client";
import { motion } from "framer-motion";
import { FiCheck } from "react-icons/fi";
import { LOADING_STEPS } from "@/lib/constants";

export default function LoadingTimeline({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto">
      {LOADING_STEPS.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 text-sm ${
              done || active ? "text-white" : "text-slate-500"
            }`}
          >
            <span
              className={`w-5 h-5 flex items-center justify-center rounded-full border ${
                done
                  ? "bg-green-500 border-green-500"
                  : active
                  ? "border-blue-400 animate-pulse"
                  : "border-slate-600"
              }`}
            >
              {done && <FiCheck className="text-white text-xs" />}
            </span>
            {step}
          </motion.div>
        );
      })}
    </div>
  );
}
