"use client";

import React, { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { ArrowDownToLine, CheckCircle2, ShieldCheck, X, Loader2 } from "lucide-react";
import { getContractAddresses, MARKETPLACE_ABI, decodeContractError } from "../lib/contracts";
import { formatEther } from "../lib/utils";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  proceedsWei: bigint;
  onSuccess?: () => void;
}

export function WithdrawModal({ isOpen, onClose, proceedsWei, onSuccess }: WithdrawModalProps) {
  const { chainId } = useAccount();
  const addresses = getContractAddresses(chainId);

  const { writeContract, data: txHash, isPending: isPrompting, error: writeError, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleWithdraw = () => {
    writeContract({
      address: addresses.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "withdrawProceeds",
    });
  };

  const handleClose = () => {
    if (isSuccess && onSuccess) {
      onSuccess();
    }
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Pull Payment Settlement</h3>
            <p className="text-xs text-zinc-400">Non-reentrant on-chain funds withdrawal</p>
          </div>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Available Proceeds:</span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono">
              {formatEther(proceedsWei)} ETH
            </span>
          </div>

          <div className="border-t border-zinc-800/60 pt-2 flex items-start gap-2 text-[11px] text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              All marketplace sales credit pull-payment balances automatically to protect transactions
              from reverting receivers. Zero balance is locked before ETH transfer.
            </span>
          </div>
        </div>

        {writeError && (
          <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 p-2.5 rounded-lg">
            {decodeContractError(writeError)}
          </p>
        )}

        {isSuccess ? (
          <div className="space-y-3 text-center py-2">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>Proceeds transferred directly to your wallet!</span>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <button
            onClick={handleWithdraw}
            disabled={isPrompting || isConfirming || proceedsWei === BigInt(0)}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
          >
            {isPrompting || isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isPrompting ? "Confirm in Wallet..." : "Withdrawing ETH..."}</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="h-4 w-4" />
                <span>Withdraw {formatEther(proceedsWei)} ETH</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
