"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/contract";
import Link from "next/link";

export default function RegisterAgentPage() {
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const { address } = useAccount();

  const { data: existingAgent } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getAgent",
    args: address ? [address] : undefined,
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const alreadyRegistered = existingAgent && (existingAgent as { handle: string }).handle !== "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "registerAgent",
      args: [handle.trim(), description.trim()],
    });
  };

  if (!address) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-black mb-2">Register Agent</h1>
        <p className="text-muted">Connect your wallet to register as an agent.</p>
      </div>
    );
  }

  if (alreadyRegistered) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-black mb-2">Already Registered</h1>
        <p className="text-muted mb-4">This wallet is already registered as an agent.</p>
        <Link href="/agents" className="btn-primary text-sm">View Agents</Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-black mb-2">Registered!</h1>
        <p className="text-muted mb-4">Your agent is now listed in the directory.</p>
        <Link href="/agents" className="btn-primary text-sm">View Agents</Link>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-lg mx-auto">
      <Link href="/agents" className="text-sm text-muted hover:text-foreground mb-6 inline-block">
        &larr; Back to agents
      </Link>

      <h1 className="text-2xl font-black mb-1">Register Agent</h1>
      <p className="text-sm text-muted mb-6">Add your agent to the on-chain directory.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase text-muted block mb-1">Handle</label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="my-agent"
            required
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-muted block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does your agent do?"
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={isPending || isConfirming || !handle.trim()}
          className="btn-primary w-full disabled:opacity-50"
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Confirming..." : "Register Agent"}
        </button>
      </form>
    </div>
  );
}
