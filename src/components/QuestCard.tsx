"use client";

import Link from "next/link";
import { STATUS_LABELS, type QuestStatus, formatTokenAmount, getTokenSymbol } from "@/lib/contract";

interface QuestCardProps {
  id: number;
  description: string;
  amount: bigint;
  creator: string;
  deadline: bigint;
  status: QuestStatus;
  token: string;
}

const statusClass: Record<QuestStatus, string> = {
  0: "status-open",
  1: "status-accepted",
  2: "status-completed",
  3: "status-cancelled",
  4: "status-disputed",
};

export function QuestCard({ id, description, amount, creator, deadline, status, token }: QuestCardProps) {
  const deadlineDate = new Date(Number(deadline) * 1000);
  const isExpired = deadlineDate < new Date();
  const tokenSymbol = getTokenSymbol(token);

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
            <div className="text-xl font-black text-accent">{formatTokenAmount(amount, token)}</div>
            <div className="text-xs font-bold text-muted">{tokenSymbol}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
