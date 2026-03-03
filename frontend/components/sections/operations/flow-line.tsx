"use client";

import React from "react";
import { motion } from "framer-motion";

interface FlowLineProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  animated?: boolean;
}

export const FlowLine: React.FC<FlowLineProps> = ({
  startX,
  startY,
  endX,
  endY,
  animated = false,
}) => {
  // Offset to center connectors on icons (assuming 64x64 node container)
  const nodeOffset = 32;
  const sX = startX + nodeOffset;
  const sY = startY + nodeOffset;
  const eX = endX + nodeOffset;
  const eY = endY + nodeOffset;

  // Calculate path
  const path = `M ${sX} ${sY} L ${eX} ${eY}`;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
      <defs>
        <linearGradient
          id={`pulse-grad-${startX}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="#00f2f2" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* Static background dashed line */}
      <path
        d={path}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="1"
        fill="none"
        strokeDasharray="4 4"
      />

      {/* Animated glow line */}
      {animated && (
        <>
          <motion.path
            d={path}
            stroke="#00f2f2"
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />

          <motion.path
            d={path}
            stroke="#00f2f2"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            initial={{
              strokeDasharray: "1, 100",
              strokeDashoffset: "0",
              opacity: 0.8,
            }}
            animate={{ strokeDashoffset: "-100", opacity: [0.3, 0.8, 0.3] }}
            transition={{
              strokeDashoffset: {
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              },
              opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        </>
      )}
    </svg>
  );
};
