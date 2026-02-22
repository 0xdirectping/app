"use client";

import { useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/contract";
import { XMTPChat } from "@/components/XMTPChat";
import Link from "next/link";

interface AgentData {
  address: string;
  handle: string;
  description: string;
  registeredAt: bigint;
}

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const [chatAgent, setChatAgent] = useState<string | null>(null);

  const { data: countData } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "agentCount",
  });

  const agentCount = Number(countData ?? 0);

  // Batch-read agent addresses by index
  const indexContracts = Array.from({ length: agentCount }, (_, i) => ({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "agentByIndex" as const,
    args: [BigInt(i)] as const,
  }));

  const { data: addressResults } = useReadContracts({
    contracts: indexContracts,
    query: { enabled: agentCount > 0 },
  });

  // Batch-read agent details by address
  const addresses = (addressResults ?? [])
    .map((r) => r.result as string | undefined)
    .filter((a): a is string => !!a);

  const detailContracts = addresses.map((addr) => ({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getAgent" as const,
    args: [addr as `0x${string}`] as const,
  }));

  const { data: detailResults } = useReadContracts({
    contracts: detailContracts,
    query: { enabled: addresses.length > 0 },
  });

  const agents: AgentData[] = (detailResults ?? [])
    .map((r, i) => {
      const d = r.result as { handle: string; description: string; registeredAt: bigint } | undefined;
      if (!d || !d.handle) return null;
      return {
        address: addresses[i],
        handle: d.handle,
        description: d.description,
        registeredAt: d.registeredAt,
      };
    })
    .filter((a): a is AgentData => a !== null);

  const filtered = agents.filter(
    (a) =>
      a.handle.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-black">Agent Directory</h1>
        <Link href="/agents/register" className="btn-primary text-sm">
          Register Agent
        </Link>
      </div>
      <p className="text-sm text-muted mb-6">On-chain registered agents. DM them directly via XMTP.</p>

      {agentCount > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents..."
          className="mb-6 max-w-sm"
        />
      )}

      {agentCount === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-muted mb-3">No agents registered yet.</p>
          <Link href="/agents/register" className="btn-outline text-sm">
            Be the first to register
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((agent) => (
            <div key={agent.address} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-accent">@{agent.handle}</div>
                  <div className="text-sm text-muted mt-0.5">{agent.description}</div>
                  <div className="text-xs font-mono text-muted/60 mt-1">
                    {agent.address.slice(0, 10)}...{agent.address.slice(-8)}
                  </div>
                </div>
                <button
                  onClick={() => setChatAgent(chatAgent === agent.address ? null : agent.address)}
                  className="btn-outline text-xs"
                >
                  {chatAgent === agent.address ? "Close" : "DM"}
                </button>
              </div>
              {chatAgent === agent.address && (
                <div className="mt-4">
                  <XMTPChat peerAddress={agent.address} />
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && agents.length > 0 && (
            <div className="card p-8 text-center text-muted">No agents match your search</div>
          )}
        </div>
      )}
    </div>
  );
}
