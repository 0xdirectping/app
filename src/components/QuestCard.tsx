"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { STATUS_LABELS, type QuestStatus } from "@/lib/contract";

interface QuestCardProps {
  id: number;
  description: string;
  amount: bigint;
  creator: string;
  deadline: bigint;
  status: QuestStatus;
}

const statusClass: Record<QuestStatus, string> = {
  0: "status-open",
  1: "status-accepted",
  2: "status-completed",
  3: "status-cancelled",
  4: "status-disputed",
};

export function QuestCard({ id, description, amount, creator, deadline, status }: QuestCardProps) {
  const deadlineDate = new Date(Number(deadline) * 1000);
  const isExpired = deadlineDate < new Date();

  return (
    <Link href={`/quests/${id}`}>
      <div className="card p-5 cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className={`pill text-[10px] mb-2 ${status === 0 ? '' : 'bg-[#e4e4e7] text-muted'}`}>
              {STATUS_LABELS[status]}
            </div>
            <p className="font-bold text-foreground line-clamp-2">{description}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted">
              <span className="font-mono">{creator.slice(0, 6)}...{creator.slice(-4)}</span>
              <span>|</span>
              <span>{isExpired ? "Expired" : deadlineDate.toLocaleDateString()}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-black text-accent">{formatEther(amount)}</div>
            <div className="text-xs font-bold text-muted">ETH</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
