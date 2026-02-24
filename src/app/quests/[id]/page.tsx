"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS, STATUS_LABELS, type QuestStatus, formatTokenAmount, getTokenSymbol } from "@/lib/contract";
import { XMTPChat } from "@/components/XMTPChat";
import Link from "next/link";

const statusClass: Record<QuestStatus, string> = {
  0: "status-open",
  1: "status-accepted",
  2: "status-completed",
  3: "status-cancelled",
  4: "status-disputed",
};

export default function QuestDetailPage() {
  const params = useParams();
  const questId = BigInt(params.id as string);
  const { address } = useAccount();

  const { data: quest, refetch } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getQuest",
    args: [questId],
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess, refetch]);

  if (!quest) {
    return <div className="py-16 text-center text-muted">Loading quest...</div>;
  }

  const q = quest as {
    creator: string;
    worker: string;
    amount: bigint;
    description: string;
    deadline: bigint;
    status: number;
    token: string;
  };

  const status = q.status as QuestStatus;
  const isCreator = address?.toLowerCase() === q.creator.toLowerCase();
  const isWorker = address?.toLowerCase() === q.worker.toLowerCase();
  const deadlineDate = new Date(Number(q.deadline) * 1000);
  const otherParty = isCreator ? q.worker : q.creator;
  const showChat = status === 1 && (isCreator || isWorker) && otherParty !== "0x0000000000000000000000000000000000000000";
  const tokenSymbol = getTokenSymbol(q.token);

  const handleAccept = () => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "acceptQuest",
      args: [questId],
    });
  };

  const handleComplete = () => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "completeQuest",
      args: [questId],
    });
  };

  const handleCancel = () => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "cancelQuest",
      args: [questId],
    });
  };

  const handleDispute = () => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "openDispute",
      args: [questId],
    });
  };

  const handleClaimExpired = () => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "claimExpiredRefund",
      args: [questId],
    });
  };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <Link href="/quests" className="text-sm text-muted hover:text-foreground mb-6 inline-block">
        &larr; Back to quests
      </Link>

      <div className="card p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <span className={`text-xs font-bold uppercase ${statusClass[status]}`}>
              {STATUS_LABELS[status]}
            </span>
            <h1 className="text-xl font-bold mt-1">Quest #{params.id as string}</h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-accent">{formatTokenAmount(q.amount, q.token)} {tokenSymbol}</div>
            <div className="text-xs text-muted">locked in escrow</div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase text-muted mb-2">Description</h2>
          <p className="text-sm leading-relaxed">{q.description}</p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <span className="text-xs text-muted block">Creator</span>
            <span className="font-mono text-xs">{q.creator.slice(0, 8)}...{q.creator.slice(-6)}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Worker</span>
            <span className="font-mono text-xs">
              {q.worker === "0x0000000000000000000000000000000000000000" ? "None yet" : `${q.worker.slice(0, 8)}...${q.worker.slice(-6)}`}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted block">Deadline</span>
            <span className="text-xs">{deadlineDate.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Status</span>
            <span className={`text-xs font-semibold ${statusClass[status]}`}>{STATUS_LABELS[status]}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {status === 0 && !isCreator && address && (
            <button onClick={handleAccept} disabled={isPending || isConfirming} className="btn-primary flex-1 disabled:opacity-50">
              {isPending ? "Confirm..." : isConfirming ? "Confirming..." : "Accept Quest"}
            </button>
          )}
          {status === 1 && isCreator && (
            <button onClick={handleComplete} disabled={isPending || isConfirming} className="btn-primary flex-1 disabled:opacity-50">
              {isPending ? "Confirm..." : isConfirming ? "Confirming..." : "Mark Complete & Release Funds"}
            </button>
          )}
          {status === 0 && isCreator && (
            <button onClick={handleCancel} disabled={isPending || isConfirming} className="btn-outline flex-1 text-danger disabled:opacity-50">
              {isPending ? "Confirm..." : isConfirming ? "Confirming..." : "Cancel & Refund"}
            </button>
          )}
          {status === 1 && (isCreator || isWorker) && (
            <button onClick={handleDispute} disabled={isPending || isConfirming} className="btn-outline flex-1 text-amber-600 disabled:opacity-50">
              {isPending ? "Confirm..." : isConfirming ? "Confirming..." : "Open Dispute"}
            </button>
          )}
          {status === 0 && deadlineDate < new Date() && (
            <button onClick={handleClaimExpired} disabled={isPending || isConfirming} className="btn-outline flex-1 disabled:opacity-50">
              {isPending ? "Confirm..." : isConfirming ? "Confirming..." : "Claim Expired Refund"}
            </button>
          )}
        </div>
      </div>

      {/* XMTP Chat */}
      {showChat && (
        <div className="mt-6">
          <XMTPChat peerAddress={otherParty} />
        </div>
      )}
    </div>
  );
}
