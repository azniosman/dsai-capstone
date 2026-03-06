"use client";

import { motion } from "framer-motion";
import { BrainCircuit, ArrowRight } from "lucide-react";

export default function AIEngineDiagram() {
  const steps = [
    "User Query",
    "Embedding Generation",
    "Vector DB Search",
    "Context Builder",
    "LLM Reasoning",
    "Insight Generation",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="clay-panel border-t-2 border-t-indigo-500/50 p-6 relative"
    >
      <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
        <BrainCircuit className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-bold tracking-widest text-indigo-50 uppercase">
          AI Operations Engine
        </h2>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 py-8 relative">
        {/* Animated Data Packet */}
        <motion.div
          className="hidden md:block absolute left-[5%] top-1/2 -mt-1 w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,1)] z-10"
          animate={{
            x: ["0%", "850%", "0%"],
            opacity: [0, 1, 1, 1, 0, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.1, 0.5, 0.9, 1],
          }}
        />

        {steps.map((step, idx) => (
          <div key={step} className="flex items-center gap-4 relative z-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              viewport={{ once: true }}
              className="bg-black/60 border border-indigo-500/30 px-4 py-3 rounded-sm backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.1)] w-36 text-center"
            >
              <span className="text-[10px] md:text-xs font-mono font-bold text-indigo-200 tracking-widest uppercase block">
                {step}
              </span>
            </motion.div>

            {/* Separator Arrow */}
            {idx < steps.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="hidden md:flex text-indigo-500/50"
              >
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
