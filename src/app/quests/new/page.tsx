"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { ESCROW_ABI, ESCROW_ADDRESS, ERC20_ABI, USDC_ADDRESS, ZERO_ADDRESS } from "@/lib/contract";
import { WalletConnect } from "@/components/WalletConnect";
import { useRouter } from "next/navigation";

export default function NewQuestPage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [bounty, setBounty] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [token, setToken] = useState<"ETH" | "USDC">("ETH");
  const [step, setStep] = useState<"form" | "approving" | "creating">("form");

  const { data: hash, writeContract, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // For USDC approval tracking
  const { data: approveHash, writeContract: writeApprove, isPending: isApprovePending, reset: resetApprove } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // Read current USDC allowance
  const usdcAmount = token === "USDC" && bounty ? parseUnits(bounty, 6) : BigInt(0);
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address || ZERO_ADDRESS, ESCROW_ADDRESS],
    query: { enabled: token === "USDC" && !!address },
  });

  const needsApproval = token === "USDC" && usdcAmount > BigInt(0) && (allowance ?? BigInt(0)) < usdcAmount;

  const handleApprove = () => {
    setStep("approving");
    writeApprove({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ESCROW_ADDRESS, usdcAmount],
    });
  };

  const handleCreateQuest = () => {
    if (!description || !bounty) return;
    setStep("creating");

    const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86400);

    if (token === "ETH") {
      writeContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "createQuest",
        args: [description, deadline, ZERO_ADDRESS, BigInt(0)],
        value: parseEther(bounty),
      });
    } else {
      writeContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "createQuest",
        args: [description, deadline, USDC_ADDRESS, usdcAmount],
      });
    }
  };

  // After approval succeeds, refetch allowance and proceed to create
  if (isApproveSuccess && step === "approving") {
    refetchAllowance();
    setStep("form");
    resetApprove();
  }

  if (isSuccess) {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl mb-4 text-accent">&#10003;</div>
        <h1 className="text-2xl font-black mb-2">Quest Posted!</h1>
        <p className="text-muted mb-6">Your {token} is locked in escrow until the quest is completed or cancelled.</p>
        <button onClick={() => router.push("/quests")} className="btn-primary">
          View Quests
        </button>
      </div>
    );
  }

  if (!isConnected) return <WalletConnect />;

  return (
    <div className="py-8 max-w-lg mx-auto">
      <h1 className="text-3xl font-black mb-2">Post a Quest</h1>
      <p className="text-sm text-muted mb-8">Lock ETH or USDC as a bounty. Release when work is done.</p>

      <form onSubmit={(e) => { e.preventDefault(); needsApproval ? handleApprove() : handleCreateQuest(); }} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you need done..."
            rows={4}
            required
          />
        </div>

        {/* Token selector */}
        <div>
          <label className="block text-sm font-semibold mb-2">Token</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setToken("ETH"); setBounty(""); reset(); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                token === "ETH"
                  ? "bg-accent text-white"
                  : "bg-card border-2 border-border text-muted hover:text-foreground"
              }`}
            >
              ETH
            </button>
            <button
              type="button"
              onClick={() => { setToken("USDC"); setBounty(""); reset(); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                token === "USDC"
                  ? "bg-accent text-white"
                  : "bg-card border-2 border-border text-muted hover:text-foreground"
              }`}
            >
              USDC
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Bounty ({token})</label>
          <input
            type="number"
            step={token === "ETH" ? "0.001" : "1"}
            min={token === "ETH" ? "0.001" : "1"}
            value={bounty}
            onChange={(e) => setBounty(e.target.value)}
            placeholder={token === "ETH" ? "0.01" : "10"}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Deadline (days from now)</label>
          <input
            type="number"
            min="1"
            max="365"
            value={deadlineDays}
            onChange={(e) => setDeadlineDays(e.target.value)}
            required
          />
        </div>

        {needsApproval ? (
          <button
            type="submit"
            disabled={isApprovePending || isApproveConfirming}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {isApprovePending
              ? "Approve in wallet..."
              : isApproveConfirming
              ? "Approving USDC..."
              : `Approve ${bounty || "0"} USDC`}
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {isPending
              ? "Confirm in wallet..."
              : isConfirming
              ? "Confirming..."
              : `Post Quest & Lock ${bounty || "0"} ${token}`}
          </button>
        )}
      </form>
    </div>
  );
}
