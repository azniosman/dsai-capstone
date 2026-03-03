"use client";

import React from "react";
import { motion } from "framer-motion";
import { AWSIcon } from "./aws-icon";
import { ArchitectureNode } from "./architecture-data";

interface ServiceNodeProps {
  node: ArchitectureNode;
  isActive: boolean;
  onClick: (node: ArchitectureNode) => void;
}

export const ServiceNode: React.FC<ServiceNodeProps> = ({
  node,
  isActive,
  onClick,
}) => {
  return (
    <motion.div
      style={{ left: node.position.x, top: node.position.y }}
      className={`absolute cursor-pointer flex flex-col items-center group z-20`}
      onClick={() => onClick(node)}
      whileHover={{ scale: 1.05 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 * (parseInt(node.id, 36) % 10) }}
    >
      {/* Tactical Glow Ring */}
      <div
        className={`
        relative p-4 border border-white/10 bg-slate-900/80 backdrop-blur-md 
        transition-all duration-300
        ${isActive ? "border-[#00f2f2] shadow-[0_0_20px_rgba(0,242,242,0.3)] bg-[#00f2f2]/10" : "group-hover:border-white/30 group-hover:bg-white/5"}
      `}
      >
        {/* Corners */}
        <div
          className={`absolute -top-1 -left-1 w-2 h-2 border-t border-l ${isActive ? "border-[#00f2f2]" : "border-white/20"}`}
        />
        <div
          className={`absolute -top-1 -right-1 w-2 h-2 border-t border-r ${isActive ? "border-[#00f2f2]" : "border-white/20"}`}
        />
        <div
          className={`absolute -bottom-1 -left-1 w-2 h-2 border-b border-l ${isActive ? "border-[#00f2f2]" : "border-white/20"}`}
        />
        <div
          className={`absolute -bottom-1 -right-1 w-2 h-2 border-b border-r ${isActive ? "border-[#00f2f2]" : "border-white/20"}`}
        />

        <AWSIcon
          type={node.type}
          size={32}
          className={isActive ? "text-[#00f2f2]" : "text-white/60"}
        />
      </div>

      <div className="mt-2 text-center">
        <span
          className={`
          tactical-label block transition-colors
          ${isActive ? "text-[#00f2f2] text-glow" : "text-neutral-500 group-hover:text-white/80"}
          text-[9px]
        `}
        >
          {node.name}
        </span>
        <span className="text-[7px] font-mono text-neutral-700 block uppercase tracking-tighter">
          {node.layer}
        </span>
      </div>
    </motion.div>
  );
};
