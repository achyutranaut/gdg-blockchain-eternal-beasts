"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BeastElement, ELEMENTS } from "@/lib/elements";

interface CardLightingProps {
  element: BeastElement;
  pointerPos: React.MutableRefObject<{ x: number; y: number }>;
}

export function CardLighting({ element, pointerPos }: CardLightingProps) {
  const spotlightRef = useRef<THREE.SpotLight>(null);
  const rimLightRef = useRef<THREE.PointLight>(null);
  const elementTheme = ELEMENTS[element] || ELEMENTS.Fire;

  useFrame(() => {
    if (spotlightRef.current) {
      // Dynamic key light following pointer with spring-damped motion
      spotlightRef.current.position.x = THREE.MathUtils.lerp(
        spotlightRef.current.position.x,
        pointerPos.current.x * 3.5,
        0.08
      );
      spotlightRef.current.position.y = THREE.MathUtils.lerp(
        spotlightRef.current.position.y,
        pointerPos.current.y * 3.5 + 0.5,
        0.08
      );
    }
  });

  return (
    <>
      {/* Ambient Fill */}
      <ambientLight intensity={0.65} color="#fafaf9" />

      {/* Main Cursor-Driven Key Spotlight */}
      <spotLight
        ref={spotlightRef}
        position={[0, 0, 4.5]}
        angle={0.7}
        penumbra={0.8}
        intensity={1.8}
        color="#ffffff"
      />

      {/* Element Accent Rim Light */}
      <pointLight
        ref={rimLightRef}
        position={[2.5, -2, -1.5]}
        intensity={1.2}
        color={elementTheme.color}
      />

      {/* Back Subtle Fill */}
      <directionalLight position={[-3, 3, -2]} intensity={0.4} color="#e7e5e4" />
    </>
  );
}
