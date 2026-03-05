"use client";

import React, { memo } from "react";
import { NodeProps } from "@xyflow/react";

export const GroupNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`relative w-full h-full rounded-sm border bg-black/20 backdrop-blur-[2px] transition-colors duration-300 ${
        selected ? "border-[#00f2f2]/50" : "border-white/10"
      }`}
    >
      <div className="absolute top-0 right-0 px-3 py-1.5 text-[9px] tracking-[0.2em] text-[#00f2f2]/80 uppercase font-mono bg-black/60 border-b border-l border-white/10 rounded-bl-sm backdrop-blur-md">
        {data.label as React.ReactNode}
      </div>
    </div>
  );
});

GroupNode.displayName = "GroupNode";
