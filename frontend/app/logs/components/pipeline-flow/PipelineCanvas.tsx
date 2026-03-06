"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  Edge,
  Node,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import CustomNode from "./CustomNode";
import type { LogEntry } from "../../page"; // We'll adjust the import once page.tsx is refactored

const nodeTypes = { custom: CustomNode };

interface PipelineCanvasProps {
  entries: LogEntry[];
}

export default function PipelineCanvas({ entries }: PipelineCanvasProps) {
  const [activeStages, setActiveStages] = useState<Set<string>>(new Set());

  // Listen to the most recent logs to light up nodes
  useEffect(() => {
    if (!entries || entries.length === 0) return;

    // Scan the last 15 logs to find what's currently active (fading out older ones)
    const recentLogs = entries.slice(-15);
    const newActive = new Set<string>();

    recentLogs.forEach((log) => {
      const msg = log.message.toLowerCase();
      const comp = (log.component || "").toLowerCase();

      if (msg.includes("query") || msg.includes("prompt"))
        newActive.add("query");
      if (comp.includes("embed") || msg.includes("embedding"))
        newActive.add("embed");
      if (
        comp.includes("vector") ||
        comp.includes("pgvector") ||
        msg.includes("hybrid search")
      )
        newActive.add("vector");
      if (comp.includes("rag") || msg.includes("retrieved"))
        newActive.add("retrieve");
      if (comp.includes("context") || msg.includes("context builder"))
        newActive.add("context");
      if (
        comp.includes("llm") ||
        comp.includes("bedrock") ||
        comp.includes("groq")
      )
        newActive.add("llm");
      if (msg.includes("response") || msg.includes("generated"))
        newActive.add("response");
    });

    setActiveStages(newActive);
  }, [entries]);

  const nodes: Node[] = useMemo(
    () => [
      {
        id: "query",
        type: "custom",
        position: { x: 50, y: 100 },
        data: {
          label: "User Query",
          isActive: activeStages.has("query"),
          icon: "👤",
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
        },
      },
      {
        id: "embed",
        type: "custom",
        position: { x: 250, y: 100 },
        data: {
          label: "Embedding",
          isActive: activeStages.has("embed"),
          icon: "🧠",
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
        },
      },
      {
        id: "vector",
        type: "custom",
        position: { x: 450, y: 100 },
        data: {
          label: "Vector DB Search",
          isActive: activeStages.has("vector"),
          icon: "🗄️",
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
        },
      },
      {
        id: "retrieve",
        type: "custom",
        position: { x: 650, y: 100 },
        data: {
          label: "Document Retrieval",
          isActive: activeStages.has("retrieve"),
          icon: "📄",
          targetPosition: Position.Left,
          sourcePosition: Position.Bottom,
        },
      },
      {
        id: "context",
        type: "custom",
        position: { x: 650, y: 250 },
        data: {
          label: "Context Builder",
          isActive: activeStages.has("context"),
          icon: "🏗️",
          targetPosition: Position.Top,
          sourcePosition: Position.Left,
        },
      },
      {
        id: "llm",
        type: "custom",
        position: { x: 450, y: 250 },
        data: {
          label: "LLM Engine",
          isActive: activeStages.has("llm"),
          icon: "🤖",
          targetPosition: Position.Right,
          sourcePosition: Position.Left,
        },
      },
      {
        id: "response",
        type: "custom",
        position: { x: 250, y: 250 },
        data: {
          label: "Response",
          isActive: activeStages.has("response"),
          icon: "✨",
          targetPosition: Position.Right,
          sourcePosition: Position.Left,
        },
      },
    ],
    [activeStages],
  );

  const edges: Edge[] = useMemo(() => {
    const defaultEdge = {
      type: "smoothstep",
      animated: true,
      style: { stroke: "#4b5563", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#4b5563" },
    };

    const activeEdge = {
      type: "smoothstep",
      animated: true,
      style: { stroke: "#fb923c", strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#fb923c" },
    };

    return [
      {
        id: "e1",
        source: "query",
        target: "embed",
        ...(activeStages.has("embed") ? activeEdge : defaultEdge),
      },
      {
        id: "e2",
        source: "embed",
        target: "vector",
        ...(activeStages.has("vector") ? activeEdge : defaultEdge),
      },
      {
        id: "e3",
        source: "vector",
        target: "retrieve",
        ...(activeStages.has("retrieve") ? activeEdge : defaultEdge),
      },
      {
        id: "e4",
        source: "retrieve",
        target: "context",
        ...(activeStages.has("context") ? activeEdge : defaultEdge),
      },
      {
        id: "e5",
        source: "context",
        target: "llm",
        ...(activeStages.has("llm") ? activeEdge : defaultEdge),
      },
      {
        id: "e6",
        source: "llm",
        target: "response",
        ...(activeStages.has("response") ? activeEdge : defaultEdge),
      },
    ];
  }, [activeStages]);

  return (
    <div className="w-full flex-1 min-h-[400px] flex flex-col bg-slate-950/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden relative shadow-2xl">
      <div className="px-4 py-3 border-b border-border/50 bg-slate-900/50 flex items-center justify-between shrink-0 drop-shadow-md z-10">
        <h3 className="text-sm font-bold tracking-tight text-white/90 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Execution Flow Live AI
          Pipeline Routing
        </h3>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background
            color="#334155"
            size={2}
            gap={20}
            className="opacity-50"
          />
          <Controls
            className="bg-background-dark! border-border! fill-orange-400! [&>button]:bg-background-dark! [&>button]:border-border! [&>button]:border-b! [&>button:hover]:bg-orange-500/10! shadow-xl"
            showInteractive={false}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
