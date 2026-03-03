"use client";

import React, { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  ContactShadows,
  Stars,
} from "@react-three/drei";
import { ARCHITECTURE_DATA, ArchitectureNode } from "./architecture-data";
import { ServiceNode3D } from "./service-node-3d";
import { FlowLine3D } from "./flow-line-3d";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
} from "@react-three/postprocessing";

interface ArchitectureSceneProps {
  onNodeSelect: (node: ArchitectureNode | null) => void;
}

export function ArchitectureScene({ onNodeSelect }: ArchitectureSceneProps) {
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(
    null,
  );
  const [hoveredNode, setHoveredNode] = useState<ArchitectureNode | null>(null);

  const handleSelect = (node: ArchitectureNode | null) => {
    setSelectedNode(node);
    onNodeSelect(node);
  };

  return (
    <div className="w-full h-full min-h-[600px] bg-black cursor-grab active:cursor-grabbing rounded-lg overflow-hidden border border-white/5 shadow-2xl">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 5, 12]} fov={50} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={30}
          maxPolarAngle={Math.PI / 1.8}
        />

        {/* Lighting Set */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00f2f2" />
        <spotLight
          position={[-10, 10, 10]}
          angle={0.15}
          penumbra={1}
          intensity={2}
          castShadow
        />

        <Suspense fallback={null}>
          <Stars
            radius={100}
            depth={50}
            count={5000}
            factor={4}
            saturation={0}
            fade
            speed={1}
          />

          <group position={[0, 0, 0]}>
            {/* Grid Helper (Tactical look) */}
            <primitive
              object={new THREE.GridHelper(20, 20, 0x00f2f2, 0x111111)}
              position={[0, -3, 0]}
            >
              <meshBasicMaterial attach="material" transparent opacity={0.1} />
            </primitive>

            {/* 3D Flow Lines */}
            {ARCHITECTURE_DATA.edges.map((edge) => {
              const source = ARCHITECTURE_DATA.nodes.find(
                (n) => n.id === edge.source,
              );
              const target = ARCHITECTURE_DATA.nodes.find(
                (n) => n.id === edge.target,
              );
              if (!source || !target) return null;

              return (
                <FlowLine3D
                  key={edge.id}
                  start={[
                    source.position.x,
                    source.position.y,
                    source.position.z,
                  ]}
                  end={[
                    target.position.x,
                    target.position.y,
                    target.position.z,
                  ]}
                  animated={edge.animated}
                />
              );
            })}

            {/* 3D Service Nodes */}
            {ARCHITECTURE_DATA.nodes.map((node) => (
              <ServiceNode3D
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                isHovered={hoveredNode?.id === node.id}
                onSelect={handleSelect}
                onHover={setHoveredNode}
              />
            ))}
          </group>

          <ContactShadows
            position={[0, -3, 0]}
            opacity={0.4}
            scale={20}
            blur={2.4}
            far={4.5}
          />

          <Environment preset="night" />
        </Suspense>

        {/* Post-Processing Effects */}
        <EffectComposer enableNormalPass={false}>
          <Bloom
            luminanceThreshold={1}
            mipmapBlur
            intensity={0.5}
            radius={0.4}
          />
          <Noise opacity={0.05} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
