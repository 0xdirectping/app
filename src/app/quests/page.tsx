"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS, type QuestStatus } from "@/lib/contract";
import { QuestCard } from "@/components/QuestCard";
import { CreateQuestForm } from "@/components/CreateQuestForm";
import { useState } from "react";

export default function QuestsPage() {
  const [filter, setFilter] = useState<QuestStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);

  const { data: questCount, refetch: refetchCount } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "questCount",
  });

  const count = questCount ? Number(questCount) : 0;

  const { data: questsData, isLoading, refetch: refetchQuests } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "getQuest" as const,
      args: [BigInt(i)] as const,
    })),
  });

  const quests = questsData
    ?.map((result, i) => {
      if (result.status !== "success" || !result.result) return null;
      const q = result.result as {
        creator: string;
        worker: string;
        amount: bigint;
        description: string;
        deadline: bigint;
        status: number;
        token: string;
      };
      return { id: i, ...q, status: q.status as QuestStatus };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null) ?? [];

  const filtered = filter === "all" ? quests : quests.filter((q) => q.status === filter);

  const handleQuestSuccess = () => {
    setShowForm(false);
    refetchCount();
    refetchQuests();
  };

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Quest Board</h1>
          <p className="mt-1 text-sm text-muted">{count} quests posted</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "btn-outline text-sm" : "btn-primary text-sm"}
        >
          {showForm ? "Cancel" : "+ Post a Quest"}
        </button>
      </div>

      {/* Inline quest creation form */}
      {showForm && (
        <div className="card p-6 mb-8">
          <CreateQuestForm onSuccess={handleQuestSuccess} />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", 0, 1, 2, 3] as const).map((f) => (
          <button
            key={String(f)}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-accent text-white"
                : "bg-card border border-border text-muted hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : ["Open", "Accepted", "Completed", "Cancelled"][f as number]}
          </button>
        ))}
      </div>

      {/* Quest List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted">Loading quests...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted">No quests found</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-block text-accent text-sm hover:underline"
          >
            Post the first quest
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((quest) => (
            <QuestCard key={quest.id} {...quest} />
          ))}
        </div>
      )}
    </div>
  );
}
