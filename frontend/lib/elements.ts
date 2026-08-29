/**
 * Elemental Beasts — Design System & Visual Identity Tokens
 *
 * Core aesthetic:
 * - Deep Charcoal / Obsidian (#080808, #0B0B0C, #111113, #161618)
 * - Warm Ivory / Off-White typography (#fafaf9, #e7e5e4, #d6d3d1)
 * - Restrained elemental accents (Fire, Water, Earth, Air, Lightning, Shadow)
 * - Physical collectible cards translated into a sophisticated digital interface
 */

export type BeastElement = "Fire" | "Water" | "Earth" | "Air" | "Lightning" | "Shadow";
export type BeastRarity = "Common" | "Rare" | "Epic" | "Legendary";

export interface ElementInfo {
  name: BeastElement;
  symbol: string;
  tagline: string;
  lore: string;
  color: string;
  hex: string;
  rgb: [number, number, number];
  secondaryHex: string;
  border: string;
  borderColor: string;
  badgeBg: string;
  bgGradient: string;
  icon: string;
  sampleImages: string[];
  defaultCreature: string;
}

export const ELEMENTS: Record<BeastElement, ElementInfo> = {
  Fire: {
    name: "Fire",
    symbol: "炎",
    tagline: "Infernal Ember & Volcanic Resolve",
    lore: "Forged in subterranean magma veins, Fire Beasts strike with kinetic heat and relentless resolve.",
    color: "#e05338",
    hex: "#e05338",
    rgb: [0.88, 0.33, 0.22],
    secondaryHex: "#f97316",
    border: "border-red-500/30 hover:border-red-500/60",
    borderColor: "border-red-500/40 hover:border-red-500",
    badgeBg: "bg-red-950/40 text-red-300 border-red-800/40",
    bgGradient: "from-red-500/20 via-orange-500/10 to-transparent",
    icon: "🔥",
    sampleImages: [
      "/beasts/wolf.svg",
      "/beasts/phoenix.svg",
    ],
    defaultCreature: "WOLF",
  },
  Water: {
    name: "Water",
    symbol: "水",
    tagline: "Abyssal Tide & Glacial Crest",
    lore: "Born in oceanic trenches devoid of sun, Water Beasts command pressurized torrents and tides.",
    color: "#2563eb",
    hex: "#2563eb",
    rgb: [0.15, 0.39, 0.92],
    secondaryHex: "#38bdf8",
    border: "border-blue-500/30 hover:border-blue-500/60",
    borderColor: "border-blue-500/40 hover:border-blue-500",
    badgeBg: "bg-blue-950/40 text-blue-300 border-blue-800/40",
    bgGradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
    icon: "💧",
    sampleImages: [
      "/beasts/serpent.svg",
      "/beasts/turtle.svg",
    ],
    defaultCreature: "SERPENT",
  },
  Earth: {
    name: "Earth",
    symbol: "地",
    tagline: "Primordial Monolith & Flora",
    lore: "Carved from tectonic strata and ancient roots, Earth Beasts command stone and stability.",
    color: "#15803d",
    hex: "#15803d",
    rgb: [0.08, 0.50, 0.24],
    secondaryHex: "#4ade80",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    borderColor: "border-emerald-500/40 hover:border-emerald-500",
    badgeBg: "bg-emerald-950/40 text-emerald-300 border-emerald-800/40",
    bgGradient: "from-emerald-500/20 via-green-500/10 to-transparent",
    icon: "🌿",
    sampleImages: [
      "/beasts/turtle.svg",
      "/beasts/bear.svg",
    ],
    defaultCreature: "TURTLE",
  },
  Air: {
    name: "Air",
    symbol: "風",
    tagline: "Celestial Vortex & Zephyr",
    lore: "Dwelling in thin stratosphere altitudes, Air Beasts glide upon frictionless gale currents.",
    color: "#0284c7",
    hex: "#0284c7",
    rgb: [0.01, 0.52, 0.78],
    secondaryHex: "#7dd3fc",
    border: "border-sky-500/30 hover:border-sky-500/60",
    borderColor: "border-cyan-500/40 hover:border-cyan-500",
    badgeBg: "bg-sky-950/40 text-sky-300 border-sky-800/40",
    bgGradient: "from-cyan-500/20 via-sky-500/10 to-transparent",
    icon: "🌪️",
    sampleImages: [
      "/beasts/eagle.svg",
      "/beasts/raven.svg",
    ],
    defaultCreature: "EAGLE",
  },
  Lightning: {
    name: "Lightning",
    symbol: "雷",
    tagline: "Voltaic Pulse & Surge",
    lore: "Channeling raw atmospheric ionization, Lightning Beasts strike with instantaneous luminous rupture.",
    color: "#ca8a04",
    hex: "#ca8a04",
    rgb: [0.79, 0.54, 0.02],
    secondaryHex: "#fde047",
    border: "border-yellow-500/30 hover:border-yellow-500/60",
    borderColor: "border-yellow-500/40 hover:border-yellow-500",
    badgeBg: "bg-yellow-950/40 text-yellow-300 border-yellow-800/40",
    bgGradient: "from-yellow-500/20 via-amber-500/10 to-transparent",
    icon: "⚡",
    sampleImages: [
      "/beasts/dragon.svg",
      "/beasts/tiger.svg",
    ],
    defaultCreature: "DRAGON",
  },
  Shadow: {
    name: "Shadow",
    symbol: "陰",
    tagline: "Occult Void & Eclipse",
    lore: "Born in the space between celestial planes, Shadow Beasts bend perception through twilight phase shifts.",
    color: "#7e22ce",
    hex: "#7e22ce",
    rgb: [0.49, 0.13, 0.81],
    secondaryHex: "#c084fc",
    border: "border-purple-500/30 hover:border-purple-500/60",
    borderColor: "border-purple-500/40 hover:border-purple-500",
    badgeBg: "bg-purple-950/40 text-purple-300 border-purple-800/40",
    bgGradient: "from-purple-500/20 via-fuchsia-500/10 to-transparent",
    icon: "🔮",
    sampleImages: [
      "/beasts/raven.svg",
      "/beasts/lion.svg",
    ],
    defaultCreature: "RAVEN",
  },
};

export interface RarityInfo {
  name: BeastRarity;
  tier: number;
  label: string;
  color: string;
  badgeBg: string;
  statBonus: number;
  glow: string;
  foilRoughness: number;
  foilMetalness: number;
  foilIntensity: number;
}

export const RARITIES: Record<BeastRarity, RarityInfo> = {
  Common: {
    name: "Common",
    tier: 1,
    label: "COMMON",
    color: "#94a3b8",
    badgeBg: "bg-zinc-900 text-zinc-400 border-zinc-800",
    statBonus: 0,
    glow: "shadow-none",
    foilRoughness: 0.6,
    foilMetalness: 0.2,
    foilIntensity: 0.1,
  },
  Rare: {
    name: "Rare",
    tier: 2,
    label: "RARE",
    color: "#3b82f6",
    badgeBg: "bg-blue-950/60 text-blue-300 border-blue-800/50",
    statBonus: 15,
    glow: "shadow-[0_4px_20px_rgba(37,99,235,0.12)]",
    foilRoughness: 0.35,
    foilMetalness: 0.6,
    foilIntensity: 0.4,
  },
  Epic: {
    name: "Epic",
    tier: 3,
    label: "EPIC",
    color: "#a855f7",
    badgeBg: "bg-purple-950/60 text-purple-300 border-purple-800/50",
    statBonus: 30,
    glow: "shadow-[0_4px_25px_rgba(126,34,206,0.18)]",
    foilRoughness: 0.25,
    foilMetalness: 0.8,
    foilIntensity: 0.7,
  },
  Legendary: {
    name: "Legendary",
    tier: 4,
    label: "LEGENDARY",
    color: "#d97706",
    badgeBg: "bg-amber-950/60 text-amber-300 border-amber-600/50",
    statBonus: 45,
    glow: "shadow-[0_4px_30px_rgba(217,119,6,0.22)]",
    foilRoughness: 0.15,
    foilMetalness: 0.95,
    foilIntensity: 1.0,
  },
};

export const CREATURE_NAMES = [
  "WOLF",
  "SERPENT",
  "LION",
  "BEAR",
  "TURTLE",
  "EAGLE",
  "DRAGON",
  "RAVEN",
  "PHOENIX",
  "TIGER",
] as const;

export const BEAST_ARTWORK_MAP: Record<string, string> = {
  WOLF: "/beasts/wolf.svg",
  SERPENT: "/beasts/serpent.svg",
  TURTLE: "/beasts/turtle.svg",
  EAGLE: "/beasts/eagle.svg",
  DRAGON: "/beasts/dragon.svg",
  RAVEN: "/beasts/raven.svg",
  LION: "/beasts/lion.svg",
  BEAR: "/beasts/bear.svg",
  PHOENIX: "/beasts/phoenix.svg",
  TIGER: "/beasts/tiger.svg",
};
