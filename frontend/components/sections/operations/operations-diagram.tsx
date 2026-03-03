"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ARCHITECTURE_DATA, ArchitectureNode } from "./architecture-data";
import { ServiceNode } from "./service-node";
import { FlowLine } from "./flow-line";
import { Terminal, Cpu, Shield, Info, X } from "lucide-react";

export function OperationsDiagram() {
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(
    null,
  );

  return (
    <div className="relative w-full h-[700px] bg-black/40 border border-white/5 backdrop-blur-sm overflow-hidden group">
      {/* Background Grid */}
      <div className="absolute inset-0 cyber-grid opacity-20" />

      {/* Diagram Container */}
      <div className="relative w-full h-full p-10">
        {/* Lines First (Under Nodes) */}
        {ARCHITECTURE_DATA.edges.map((edge) => {
          const source = ARCHITECTURE_DATA.nodes.find(
            (n) => n.id === edge.source,
          );
          const target = ARCHITECTURE_DATA.nodes.find(
            (n) => n.id === edge.target,
          );
          if (!source || !target) return null;

          return (
            <FlowLine
              key={edge.id}
              startX={source.position.x}
              startY={source.position.y}
              endX={target.position.x}
              endY={target.position.y}
              animated={edge.animated}
            />
          );
        })}

        {/* Nodes */}
        {ARCHITECTURE_DATA.nodes.map((node) => (
          <ServiceNode
            key={node.id}
            node={node}
            isActive={selectedNode?.id === node.id}
            onClick={setSelectedNode}
          />
        ))}
      </div>

      {/* Layer Labels */}
      <div className="absolute top-6 left-6 flex flex-col gap-1 pointer-events-none">
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
            className="absolute right-0 top-0 bottom-0 w-[320px] bg-black/90 border-l border-white/10 p-8 z-50 backdrop-blur-xl"
          >
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-8">
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
                        <span className="text-white">
                          {selectedNode.metadata.specs}
                        </span>
                      </div>
                    )}
                    {selectedNode.metadata.runtime && (
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-neutral-500 uppercase">
                          Runtime:
                        </span>
                        <span className="text-white">
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
                  <p className="text-[13px] font-sans text-neutral-400 leading-relaxed uppercase tracking-wider">
                    {selectedNode.metadata.description}
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex items-center gap-2 text-neutral-600">
                  <Terminal className="w-4 h-4" />
                  <span className="tactical-label text-[9px]">
                    AWS_REGION: SG_NODE_01
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State Instruction */}
      {!selectedNode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="px-4 py-2 border border-white/10 bg-black/40 backdrop-blur-md rounded-full">
            <span className="tactical-label text-[8px] text-neutral-500">
              SELECT_NODE_FOR_SYSTEM_TELEMETRY
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
