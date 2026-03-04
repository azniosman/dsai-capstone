"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ARCHITECTURE_DATA, ArchitectureNode } from "./architecture-data";
import { Terminal, Cpu, Shield, Info, X } from "lucide-react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomNode } from "./custom-node";
import { CustomEdge } from "./custom-edge";

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

export function OperationsDiagram() {
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(
    null,
  );

  // Initialize nodes for React Flow
  const initialNodes: Node[] = useMemo(
    () =>
      ARCHITECTURE_DATA.nodes.map((node) => ({
        id: node.id,
        type: "custom",
        position: { x: node.position.x, y: node.position.y },
        data: {
          name: node.name,
          type: node.type,
          layer: node.layer,
        },
      })),
    [],
  );

  // Initialize edges for React Flow
  const initialEdges: Edge[] = useMemo(
    () =>
      ARCHITECTURE_DATA.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "custom",
        animated: edge.animated,
      })),
    [],
  );

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const archNode = ARCHITECTURE_DATA.nodes.find((n) => n.id === node.id);
    if (archNode) {
      setSelectedNode(archNode);

      // Update nodes to reflect active state
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            return { ...n, data: { ...n.data, isActive: true } };
          }
          return { ...n, data: { ...n.data, isActive: false } };
        }),
      );
    }
  }, []);

  const handleCloseSidebar = () => {
    setSelectedNode(null);
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, isActive: false } })),
    );
  };

  return (
    <div className="relative w-full h-[700px] bg-black/40 border border-white/5 backdrop-blur-sm overflow-hidden group">
      {/* Diagram Container */}
      <div className="absolute inset-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="operations-flow"
        >
          <Background
            variant={BackgroundVariant.Lines}
            gap={32}
            size={1}
            color="rgba(0, 242, 242, 0.05)"
          />
          <style>
            {`
              .operations-flow .react-flow__pane {
                cursor: grab;
              }
              .operations-flow .react-flow__pane:active {
                cursor: grabbing;
              }
              
              /* Disable default handle dots */
              .react-flow__handle {
                display: none;
              }

              /* Custom glow edge animation */
              .animated-flow-line {
                animation: flow 1.5s linear infinite;
              }
              @keyframes flow {
                from { stroke-dashoffset: 30; }
                to { stroke-dashoffset: 0; }
              }
            `}
          </style>
          <Controls className="fill-neutral-500 bg-black/60 border border-white/10 backdrop-blur-md rounded-md overflow-hidden" />
        </ReactFlow>
      </div>

      {/* Layer Labels */}
      <div className="absolute top-6 left-6 flex flex-col gap-1 pointer-events-none z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-[#00f2f2]" />
          <span className="tactical-label text-[8px] text-[#00f2f2]/60">
            VPC_PRIVATE_NETWORK_ACTIVE
          </span>
        </div>
      </div>

      {/* Info Sidebar / Tooltip */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute right-0 top-0 bottom-0 w-[320px] bg-black/90 border-l border-[#00f2f2]/20 p-8 z-50 backdrop-blur-2xl"
          >
            <div className="absolute top-0 left-0 w-1 h-20 bg-[#00f2f2]" />
            <button
              onClick={handleCloseSidebar}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-8 mt-4">
              <div className="space-y-2">
                <div className="tactical-label text-[#00f2f2]">
                  {selectedNode.layer}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">
                  {selectedNode.name}
                </h3>
                <div className="h-0.5 w-12 bg-[#00f2f2]" />
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#00f2f2]">
                    <Info className="w-4 h-4" />
                    <span className="tactical-label text-[10px]">
                      SPECIFICATIONS
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-sm space-y-2">
                    {selectedNode.metadata.specs && (
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-neutral-500 uppercase">
                          Config:
                        </span>
                        <span
                          className="text-white text-right max-w-[150px] truncate"
                          title={selectedNode.metadata.specs}
                        >
                          {selectedNode.metadata.specs}
                        </span>
                      </div>
                    )}
                    {selectedNode.metadata.runtime && (
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-neutral-500 uppercase">
                          Runtime:
                        </span>
                        <span
                          className="text-white text-right max-w-[150px] truncate"
                          title={selectedNode.metadata.runtime}
                        >
                          {selectedNode.metadata.runtime}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-neutral-500 uppercase">
                        Status:
                      </span>
                      <span className="text-[#00f2f2] animate-pulse">
                        DEPLOYED
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#00f2f2]">
                    <Cpu className="w-4 h-4" />
                    <span className="tactical-label text-[10px]">
                      FUNCTION_SYNOPSIS
                    </span>
                  </div>
                  <p className="text-[13px] font-sans text-neutral-300 leading-relaxed uppercase tracking-wider font-medium">
                    {selectedNode.metadata.description}
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex items-center gap-2 text-neutral-600">
                  <Terminal className="w-4 h-4" />
                  <span className="tactical-label text-[9px]">
                    AWS_REGION: US-EAST-1
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State Instruction */}
      {!selectedNode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="px-5 py-3 border border-white/10 bg-black/60 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md rounded-full">
            <span className="tactical-label text-[9px] text-[#00f2f2]">
              SELECT_NODE_FOR_SYSTEM_TELEMETRY
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
