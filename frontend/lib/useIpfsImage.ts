"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IPFS_GATEWAYS, resolveIpfsUrl } from "./ipfs";

const isIpfsUri = (uri: string | undefined) =>
  Boolean(uri && (uri.startsWith("ipfs://") || uri.startsWith("Qm") || uri.startsWith("bafy")));

/** Resolves an IPFS image through each configured gateway before using a placeholder. */
export function useIpfsImage(uri: string | undefined) {
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const retryable = isIpfsUri(uri);

  useEffect(() => {
    setGatewayIndex(0);
    setExhausted(false);
  }, [uri]);

  const src = useMemo(
    () => exhausted ? "/placeholder-beast.svg" : resolveIpfsUrl(uri, gatewayIndex),
    [uri, gatewayIndex, exhausted]
  );

  const onError = useCallback(() => {
    if (retryable && gatewayIndex < IPFS_GATEWAYS.length - 1) {
      setGatewayIndex((index) => index + 1);
      return;
    }
    setExhausted(true);
  }, [gatewayIndex, retryable]);

  return { src, onError, gatewayIndex, exhausted };
}
