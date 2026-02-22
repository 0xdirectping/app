"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/contract";
import { WalletConnect } from "@/components/WalletConnect";
import { useRouter } from "next/navigation";

export default function NewQuestPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [bounty, setBounty] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("7");

  const { data: hash, writeContract, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !bounty) return;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86400);

    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "createQuest",
      args: [description, deadline],
      value: parseEther(bounty),
    });
  };

  if (isSuccess) {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl mb-4 text-accent">&#10003;</div>
        <h1 className="text-2xl font-black mb-2">Quest Posted!</h1>
        <p className="text-muted mb-6">Your ETH is locked in escrow until the quest is completed or cancelled.</p>
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
      <p className="text-sm text-muted mb-8">Lock ETH as a bounty. Release when work is done.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div>
          <label className="block text-sm font-semibold mb-2">Bounty (ETH)</label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={bounty}
            onChange={(e) => setBounty(e.target.value)}
            placeholder="0.01"
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

        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="btn-primary w-full py-3 disabled:opacity-50"
        >
          {isPending
            ? "Confirm in wallet..."
            : isConfirming
            ? "Confirming..."
            : `Post Quest & Lock ${bounty || "0"} ETH`}
        </button>
      </form>
    </div>
  );
}
