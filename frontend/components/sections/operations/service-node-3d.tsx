"use client";

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float, Html } from "@react-three/drei";
import * as THREE from "three";
import { AWSIcon } from "./aws-icon";
import { ArchitectureNode } from "./architecture-data";

interface ServiceNode3DProps {
  node: ArchitectureNode;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (node: ArchitectureNode | null) => void;
  onHover: (node: ArchitectureNode | null) => void;
}

export function ServiceNode3D({
  node,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: ServiceNode3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Subtle animation on hover
  useFrame((state) => {
    if (meshRef.current) {
      if (isHovered || isSelected) {
        meshRef.current.rotation.y = THREE.MathUtils.lerp(
          meshRef.current.rotation.y,
          Math.PI / 4,
          0.1,
        );
        meshRef.current.scale.setScalar(
          THREE.MathUtils.lerp(meshRef.current.scale.x, 1.2, 0.1),
        );
      } else {
        meshRef.current.rotation.y = THREE.MathUtils.lerp(
          meshRef.current.rotation.y,
          0,
          0.1,
        );
        meshRef.current.scale.setScalar(
          THREE.MathUtils.lerp(meshRef.current.scale.x, 1, 0.1),
        );
      }
    }
  });

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(isSelected ? null : node);
          }}
          onPointerOver={() => onHover(node)}
          onPointerOut={() => onHover(null)}
        >
          {/* Main Box Shape */}
          <boxGeometry args={[1, 1, 0.2]} />
          <meshStandardMaterial
            color={isSelected ? "#00f2f2" : "#1a1a1a"}
            emissive={isSelected ? "#00f2f2" : "#000000"}
            emissiveIntensity={isSelected ? 0.5 : 0}
            metalness={0.8}
            roughness={0.2}
          />

          {/* Icon Overlay as HTML (Simplest for 2D icons in 3D) */}
          <Html distanceFactor={5} position={[0, 0, 0.11]} transform occlude>
            <div
              className={`p-2 rounded-sm border ${isSelected ? "border-[#00f2f2] bg-[#00f2f2]/20" : "border-white/10 bg-black/40"} backdrop-blur-sm`}
            >
              <AWSIcon
                type={node.type}
                size={32}
                className={isSelected ? "text-white" : "text-[#00f2f2]"}
              />
            </div>
          </Html>
        </mesh>
      </Float>

      {/* Label Text */}
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.2}
        color={isSelected ? "#00f2f2" : "#888888"}
        font="/fonts/Inter-Bold.woff" // Assuming font exists or R3F default
        anchorX="center"
        anchorY="middle"
      >
        {node.name.toUpperCase()}
      </Text>

      {/* Connection Indicator */}
      {(isHovered || isSelected) && (
        <mesh position={[0, 0, -0.1]}>
          <ringGeometry args={[0.7, 0.8, 32]} />
          <meshBasicMaterial
            color="#00f2f2"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
