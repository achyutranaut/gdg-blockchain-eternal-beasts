"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CardLighting } from "./CardLighting";
import { BeastElement, BeastRarity, ELEMENTS, RARITIES } from "@/lib/elements";
import { resolveIpfsUrl } from "@/lib/ipfs";

interface CardMeshProps {
  name: string;
  element: BeastElement;
  rarity: BeastRarity;
  imageUrl: string;
  attack: number;
  defense: number;
  speed: number;
  tokenId?: string;
  pointerPos: React.MutableRefObject<{ x: number; y: number }>;
  isHovered: boolean;
}

function CardMesh({
  name,
  element,
  rarity,
  imageUrl,
  attack,
  defense,
  speed,
  tokenId = "001",
  pointerPos,
  isHovered,
}: CardMeshProps) {
  const meshRef = useRef<THREE.Group>(null);
  const elementTheme = ELEMENTS[element] || ELEMENTS.Fire;
  const rarityTheme = RARITIES[rarity] || RARITIES.Common;

  const cardTexture = useMemo(() => {
    if (typeof window === "undefined") return null;

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const renderCard = (imgEl?: HTMLImageElement) => {
      ctx.fillStyle = "#0c0c0e";
      ctx.fillRect(0, 0, 1024, 1480);

      ctx.strokeStyle = rarityTheme.name === "Legendary" ? "#d97706" : rarityTheme.name === "Epic" ? "#9333ea" : rarityTheme.name === "Rare" ? "#2563eb" : "#27272a";
      ctx.lineWidth = 14;
      ctx.strokeRect(16, 16, 992, 1448);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 36, 952, 1408);

      ctx.fillStyle = "#141418";
      ctx.fillRect(44, 44, 936, 100);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.strokeRect(44, 44, 936, 100);

      ctx.font = "bold 16px -apple-system, monospace";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText("ELEMENTAL BEASTS", 68, 80);

      ctx.font = "bold 22px -apple-system, monospace";
      ctx.fillStyle = "#d4d4d8";
      ctx.fillText(`#${String(tokenId).padStart(3, "0")}`, 860, 80);

      ctx.font = "bold 44px 'Newsreader', Georgia, serif";
      ctx.fillStyle = "#fafaf9";
      ctx.fillText(name.toUpperCase(), 68, 126);

      const artX = 44;
      const artY = 160;
      const artW = 936;
      const artH = 800;

      ctx.fillStyle = "#08080a";
      ctx.fillRect(artX, artY, artW, artH);

      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(artX, artY, artW, artH);
        ctx.clip();
        ctx.drawImage(imgEl, artX, artY, artW, artH);
        ctx.restore();
      } else {
        const grad = ctx.createRadialGradient(512, 560, 40, 512, 560, 400);
        grad.addColorStop(0, elementTheme.color);
        grad.addColorStop(1, "#08080a");
        ctx.fillStyle = grad;
        ctx.fillRect(artX, artY, artW, artH);
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 4;
      ctx.strokeRect(artX, artY, artW, artH);

      ctx.fillStyle = "#121216";
      ctx.fillRect(44, 980, 936, 110);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeRect(44, 980, 936, 110);

      ctx.font = "bold 32px 'Newsreader', Georgia, serif";
      ctx.fillStyle = "#fafaf9";
      ctx.textAlign = "center";
      ctx.fillText(name.toUpperCase(), 512, 1030);

      ctx.font = "bold 20px -apple-system, monospace";
      ctx.fillStyle = elementTheme.color;
      ctx.fillText(`${element.toUpperCase()}`, 512, 1065);
      ctx.textAlign = "left";

      ctx.fillStyle = "#0e0e12";
      ctx.fillRect(44, 1110, 936, 180);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeRect(44, 1110, 936, 180);

      const stats = [
        { label: "ATK", val: attack, col: "#ef4444", x: 200 },
        { label: "DEF", val: defense, col: "#3b82f6", x: 512 },
        { label: "SPD", val: speed, col: "#eab308", x: 820 },
      ];

      stats.forEach((s) => {
        ctx.textAlign = "center";
        ctx.font = "bold 22px -apple-system, monospace";
        ctx.fillStyle = "#71717a";
        ctx.fillText(s.label, s.x, 1170);

        ctx.font = "bold 56px -apple-system, monospace";
        ctx.fillStyle = "#fafaf9";
        ctx.fillText(String(s.val), s.x, 1245);
      });
      ctx.textAlign = "left";

      ctx.fillStyle = "#141418";
      ctx.fillRect(44, 1310, 936, 110);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeRect(44, 1310, 936, 110);

      ctx.font = "bold 28px -apple-system, monospace";
      ctx.fillStyle = rarityTheme.color;
      ctx.fillText(rarity.toUpperCase(), 70, 1375);

      ctx.font = "18px -apple-system, monospace";
      ctx.fillStyle = "#71717a";
      ctx.textAlign = "right";
      ctx.fillText("BASE SEPOLIA", 950, 1375);
      ctx.textAlign = "left";
    };

    renderCard();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = resolveIpfsUrl(imageUrl);
    img.onload = () => {
      renderCard(img);
      texture.needsUpdate = true;
    };

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }, [name, element, rarity, imageUrl, attack, defense, speed, tokenId, elementTheme, rarityTheme]);

  useFrame(() => {
    if (!meshRef.current) return;

    const targetRotX = isHovered ? -pointerPos.current.y * 0.28 : 0;
    const targetRotY = isHovered ? pointerPos.current.x * 0.28 : 0;
    const targetPosZ = isHovered ? 0.2 : 0;

    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.06);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.06);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetPosZ, 0.06);
  });

  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.5, 3.6, 0.05]} />
        <meshStandardMaterial
          color="#121215"
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {cardTexture && (
        <mesh position={[0, 0, 0.027]}>
          <planeGeometry args={[2.46, 3.55]} />
          <meshPhysicalMaterial
            map={cardTexture}
            roughness={rarityTheme.foilRoughness}
            metalness={rarityTheme.foilMetalness}
            clearcoat={rarity === "Common" ? 0.1 : 0.6}
            clearcoatRoughness={0.2}
            reflectivity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

export interface BeastCard3DProps {
  name: string;
  element: BeastElement;
  rarity: BeastRarity;
  imageUrl: string;
  attack?: number;
  defense?: number;
  speed?: number;
  tokenId?: string;
  className?: string;
  height?: number | string;
}

export function BeastCard3D({
  name,
  element,
  rarity,
  imageUrl,
  attack = 80,
  defense = 70,
  speed = 75,
  tokenId = "001",
  className = "",
  height = "520px",
}: BeastCard3DProps) {
  const pointerPos = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    pointerPos.current = { x, y };
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    pointerPos.current = { x: 0, y: 0 };
  };

  return (
    <div
      ref={containerRef}
      onPointerEnter={() => setIsHovered(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative w-full overflow-hidden rounded bg-[#080808] border border-zinc-800/80 shadow-2xl select-none ${className}`}
      style={{ height }}
    >
      <Canvas
        camera={{ position: [0, 0, 4.8], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <CardLighting element={element} pointerPos={pointerPos} />
        <CardMesh
          name={name}
          element={element}
          rarity={rarity}
          imageUrl={imageUrl}
          attack={attack}
          defense={defense}
          speed={speed}
          tokenId={tokenId}
          pointerPos={pointerPos}
          isHovered={isHovered}
        />
      </Canvas>
    </div>
  );
}
