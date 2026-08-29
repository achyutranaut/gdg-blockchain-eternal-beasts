"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BeastElement, ELEMENTS } from "@/lib/elements";

interface ElementEffectsProps {
  element: BeastElement;
  interactive?: boolean;
}

export function ElementEffects({ element, interactive = true }: ElementEffectsProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 35;

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3.2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8 + 0.1;
      spd[i] = 0.002 + Math.random() * 0.005;
    }
    return [pos, spd];
  }, [count]);

  const elementTheme = ELEMENTS[element] || ELEMENTS.Fire;

  useFrame(() => {
    if (!pointsRef.current || !interactive) return;
    const array = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      if (element === "Fire" || element === "Air") {
        // Float upwards
        array[i * 3 + 1] += speeds[i];
        if (array[i * 3 + 1] > 2.2) array[i * 3 + 1] = -2.2;
      } else if (element === "Water") {
        // Drift downwards
        array[i * 3 + 1] -= speeds[i];
        if (array[i * 3 + 1] < -2.2) array[i * 3 + 1] = 2.2;
      } else {
        // Subtle orbital pulse
        array[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.001;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color={elementTheme.color}
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
