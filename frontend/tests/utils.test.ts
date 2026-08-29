import { describe, it, expect } from "vitest";
import { formatEther, shortenAddress, formatTimestamp } from "../lib/utils";
import { decodeContractError } from "../lib/contracts";

describe("Frontend Utility Functions", () => {
  it("formats ether correctly", () => {
    expect(formatEther("1000000000000000000")).toBe("1");
    expect(formatEther(BigInt("50000000000000000"))).toBe("0.05");
    expect(formatEther(BigInt(0))).toBe("0");
  });

  it("shortens address cleanly", () => {
    expect(shortenAddress("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")).toBe("0x3C44...93BC");
    expect(shortenAddress(undefined)).toBe("");
  });

  it("formats timestamps", () => {
    expect(formatTimestamp(undefined)).toBe("Just now");
    expect(formatTimestamp(Date.now())).toBe("Just now");
  });

  it("decodes contract custom errors into human-readable messages", () => {
    expect(decodeContractError(new Error("Marketplace__AlreadyListed"))).toContain(
      "already actively listed"
    );
    expect(decodeContractError(new Error("Marketplace__NotOwner"))).toContain(
      "do not own this Beast"
    );
    expect(decodeContractError(new Error("Marketplace__StaleListing"))).toContain(
      "Listing is stale"
    );
    expect(decodeContractError(new Error("Marketplace__ApprovalRevoked"))).toContain(
      "seller revoked marketplace approval"
    );
    expect(decodeContractError(new Error("Marketplace__NoProceeds"))).toContain(
      "no claimable proceeds"
    );
    expect(decodeContractError(new Error("User rejected the request."))).toContain(
      "Transaction was rejected"
    );
  });
});
