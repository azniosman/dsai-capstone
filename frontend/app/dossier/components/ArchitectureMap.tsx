"use client";

import { motion } from "framer-motion";
import { Network } from "lucide-react";

export default function ArchitectureMap() {
  const stacks = [
    {
      domain: "Frontend",
      color: "border-sky-500/50",
      text: "text-sky-400",
      nodes: ["Next.js", "React", "Tailwind", "Framer Motion"],
    },
    {
      domain: "Backend",
      color: "border-emerald-500/50",
      text: "text-emerald-400",
      nodes: ["NestJS", "API Services", "Serverless Functions"],
    },
    {
      domain: "AI Layer",
      color: "border-indigo-500/50",
      text: "text-indigo-400",
      nodes: ["LLM Engine", "RAG Engine", "Embedding Model"],
    },
    {
      domain: "Infrastructure",
      color: "border-orange-500/50",
      text: "text-orange-400",
      nodes: ["AWS Lambda", "S3", "Aurora PostgreSQL", "pgvector"],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="clay-panel border-t-2 border-t-slate-500/50 p-6 relative overflow-hidden"
    >
      <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
        <Network className="w-5 h-5 text-slate-400" />
        <h2 className="text-lg font-bold tracking-widest text-slate-100 uppercase">
          System Architecture Map
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {/* Animated underlying connection paths */}
        <div className="absolute top-1/2 left-0 w-full h-px bg-slate-800 hidden lg:block -z-10" />

        {stacks.map((stack, idx) => (
          <motion.div
            key={stack.domain}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + idx * 0.15 }}
            className={`border border-white/5 bg-black/40 backdrop-blur-md p-4 flex flex-col items-center border-t-2 ${stack.color} rounded-sm relative`}
          >
            <div
              className={`text-xs font-bold tracking-widest uppercase mb-4 ${stack.text}`}
            >
              {stack.domain}
            </div>

            <div className="flex flex-col gap-2 w-full text-center">
              {stack.nodes.map((node) => (
                <div
                  key={node}
                  className="bg-slate-900/50 border border-white/5 rounded py-1.5 px-2 text-[10px] font-mono text-slate-300 tracking-wider"
                >
                  {node}
                </div>
              ))}
            </div>

            {/* Glowing active node indicator */}
            <motion.div
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, delay: idx * 0.5 }}
              className={`absolute -top-[2px] right-[40%] w-1/5 h-[2px] bg-linear-to-r from-transparent via-white to-transparent`}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
