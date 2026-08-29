import React from "react";
import Link from "next/link";
import { Flame, ShieldCheck, Cpu, Code2, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 py-12 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                <Flame className="h-4 w-4 text-orange-400" />
              </div>
              <span className="font-bold text-white text-base">Elemental Beasts</span>
            </div>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
              A decentralized, non-custodial collectible NFT card game and marketplace on Base Sepolia.
              Features atomic pull-payment settlement, immutable IPFS storage, and derived indexing.
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-300 pt-2">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Non-Custodial
              </span>
              <span className="inline-flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-blue-400" /> Base Sepolia
              </span>
              <span className="inline-flex items-center gap-1">
                <Code2 className="h-3.5 w-3.5 text-orange-400" /> OZ v5 Audited
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Marketplace</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/explore" className="hover:text-white transition-colors">
                  Explore Gallery
                </Link>
              </li>
              <li>
                <Link href="/mint" className="hover:text-white transition-colors">
                  Summon Beast
                </Link>
              </li>
              <li>
                <Link href="/my-collection" className="hover:text-white transition-colors">
                  My Collection
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-white transition-colors">
                  Market Analytics
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Blockchain Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://sepolia.basescan.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Basescan Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://docs.base.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Base Documentation <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://ipfs.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  IPFS Protocol <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-900 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-300 gap-4">
          <p>© 2026 Elemental Beasts — Built for GDG Blockchain Team Recruitment.</p>
          <p className="text-zinc-300">Atomic Pull Settlement • Verifiable IPFS CIDs • Single-Collection Scoped</p>
        </div>
      </div>
    </footer>
  );
}
