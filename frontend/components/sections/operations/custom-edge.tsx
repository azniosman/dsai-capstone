"use client";

import React from "react";
import {
  getBezierPath,
  EdgeProps,
  EdgeLabelRenderer,
  BaseEdge,
} from "@xyflow/react";

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  animated,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          strokeDasharray: "4 4",
          stroke: "rgba(255,255,255,0.05)",
        }}
        id={id}
      />

      {animated && (
        <path
          d={edgePath}
          fill="none"
          stroke="#00f2f2"
          strokeWidth={2}
          strokeLinecap="round"
          className="animated-flow-line"
          style={{
            strokeDasharray: "10 20",
          }}
        />
      )}

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan bg-black/80 text-[#00f2f2] text-[8px] tracking-[0.1em] px-2 py-1 uppercase font-mono border border-[#00f2f2]/20 backdrop-blur-md rounded shadow-xl whitespace-nowrap"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
