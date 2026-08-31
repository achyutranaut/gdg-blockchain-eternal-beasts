"use client";

import React from "react";
import { CheckCircle2, XCircle, Loader2, ExternalLink, ShieldAlert, Sparkles } from "lucide-react";
import { shortenAddress } from "../lib/utils";

export type TxStep = "idle" | "wallet_confirmation" | "pending" | "syncing" | "confirmed" | "sync_failed" | "failed";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: TxStep;
  title: string;
  txHash?: `0x${string}` | string;
  errorMessage?: string;
  successMessage?: string;
  onRetry?: () => void;
  explorerUrl?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  step,
  title,
  txHash,
  errorMessage,
  successMessage,
  onRetry,
  explorerUrl = "https://sepolia.basescan.org",
}: TransactionModalProps) {
  if (!isOpen || step === "idle") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
        {/* Top ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Step: Wallet Confirmation */}
        {step === "wallet_confirmation" && (
          <div className="space-y-4 py-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Please confirm the transaction in your connected wallet.
              </p>
            </div>
          </div>
        )}

        {/* Step: Pending */}
        {step === "pending" && (
          <div className="space-y-4 py-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Broadcasting to Base Sepolia</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Transaction submitted. Awaiting block confirmation...
              </p>
            </div>
            {txHash && (
              <a
                href={`${explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs text-blue-400 font-mono transition-colors"
              >
                <span>Tx: {shortenAddress(txHash)}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Step: Collection synchronization */}
        {step === "syncing" && (
          <div className="space-y-4 py-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Finalizing your collection</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Your mint is confirmed on-chain. Saving it to your collection...
              </p>
            </div>
          </div>
        )}

        {/* Step: Confirmed */}
        {step === "confirmed" && (
          <div className="space-y-4 py-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Transaction Confirmed!
              </h3>
              <p className="text-sm text-zinc-300 mt-1">
                {successMessage || "Action completed and settled on-chain."}
              </p>
            </div>
            {txHash && (
              <a
                href={`${explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs text-emerald-400 font-mono transition-colors"
              >
                <span>View on Basescan: {shortenAddress(txHash)}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-900/20"
            >
              Done
            </button>
          </div>
        )}

        {/* Step: Failed */}
        {step === "failed" && (
          <div className="space-y-4 py-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Transaction Failed</h3>
              <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 p-3 rounded-lg mt-2 text-left font-mono break-words leading-relaxed">
                {errorMessage || "An error occurred during execution on-chain."}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {step === "sync_failed" && (
          <div className="space-y-4 py-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Mint confirmed, sync needs retry</h3>
              <p className="text-xs text-amber-200 bg-amber-950/30 border border-amber-900/50 p-3 rounded-lg mt-2 text-left leading-relaxed">
                {errorMessage || "Your NFT exists on-chain, but it could not be saved to this collection yet."}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              {onRetry && (
                <button onClick={onRetry} className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition-colors">
                  Retry sync
                </button>
              )}
              <button onClick={onClose} className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
