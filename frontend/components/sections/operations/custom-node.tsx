"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { AWSIcon, AWSIconType } from "./aws-icon";
import {
  Users,
  Workflow,
  Code2,
  Database,
  Shield,
  BookOpen,
  BrainCircuit,
  Activity,
  LineChart,
  Package,
  Search,
  Cpu,
  FileText,
} from "lucide-react";

export type IconType =
  | AWSIconType
  | "Users"
  | "Workflow"
  | "Framework"
  | "Database"
  | "Security"
  | "Library"
  | "AI"
  | "Document"
  | "CloudWatch"
  | "Activity";

interface CustomNodeData {
  name: string;
  type: IconType;
  layer: string;
  isActive?: boolean;
}

const renderIcon = (type: IconType, isActive: boolean, size: number) => {
  const className = isActive ? "text-[#00f2f2]" : "text-white/60";
  const lucideProps = { size, className, strokeWidth: 1.5 };

  switch (type) {
    case "Users":
      return <Users {...lucideProps} />;
    case "Workflow":
      return <Workflow {...lucideProps} />;
    case "Framework":
      return <Code2 {...lucideProps} />;
    case "Database":
      return <Database {...lucideProps} />;
    case "Security":
      return <Shield {...lucideProps} />;
    case "Library":
      return <Package {...lucideProps} />;
    case "AI":
      return <BrainCircuit {...lucideProps} />;
    case "Document":
      return <FileText {...lucideProps} />;
    case "CloudWatch":
      return <Search {...lucideProps} />;
    case "Activity":
      return <Activity {...lucideProps} />;
    default:
      return (
        <AWSIcon type={type as AWSIconType} size={size} className={className} />
      );
  }
};

export const CustomNode = memo(
  ({ data, selected }: { data: CustomNodeData; selected?: boolean }) => {
    const isActive = selected || data.isActive;

    return (
      <div
        className={`relative flex flex-col items-center group cursor-pointer transition-all duration-300 w-32`}
      >
        <Handle type="target" position={Position.Top} className="opacity-0" />
        <Handle
          type="source"
          position={Position.Bottom}
          className="opacity-0"
        />

        {/* Tactical Glow Ring */}
        <div
          className={`
        relative p-4 border border-white/10 bg-slate-900/80 backdrop-blur-md 
        transition-all duration-300 w-16 h-16 flex items-center justify-center
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

          {renderIcon(data.type, isActive ?? false, 32)}
        </div>

        <div className="mt-3 text-center w-full">
          <span
            className={`
          tactical-label block transition-colors
          ${isActive ? "text-[#00f2f2] text-glow" : "text-neutral-500 group-hover:text-white/80"}
          text-[10px] truncate
        `}
          >
            {data.name}
          </span>
          <span className="text-[8px] font-mono text-neutral-700 block uppercase tracking-[0.2em] mt-1">
            {data.layer}
          </span>
        </div>
      </div>
    );
  },
);

CustomNode.displayName = "CustomNode";
