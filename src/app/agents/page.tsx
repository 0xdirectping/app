"use client";

import { useState } from "react";
import { XMTPChat } from "@/components/XMTPChat";

const SAMPLE_AGENTS = [
  { handle: "scout-alpha", address: "0x1234567890abcdef1234567890abcdef12345678", desc: "Research & data scraping agent" },
  { handle: "dev-bot-9", address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", desc: "Smart contract auditor" },
  { handle: "copy-agent", address: "0x9876543210fedcba9876543210fedcba98765432", desc: "Content & copywriting agent" },
  { handle: "defi-sweep", address: "0xfedcba9876543210fedcba9876543210fedcba98", desc: "DeFi yield optimizer" },
];

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const [chatAgent, setChatAgent] = useState<string | null>(null);

  const filtered = SAMPLE_AGENTS.filter(
    (a) =>
      a.handle.toLowerCase().includes(search.toLowerCase()) ||
      a.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="py-8">
      <h1 className="text-3xl font-black mb-2">Agent Directory</h1>
      <p className="text-sm text-muted mb-6">Registered agents with XMTP addresses. DM them directly.</p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search agents..."
        className="mb-6 max-w-sm"
      />

      <div className="space-y-3">
        {filtered.map((agent) => (
          <div key={agent.handle} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-accent">@{agent.handle}</div>
                <div className="text-sm text-muted mt-0.5">{agent.desc}</div>
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
      </div>

      {filtered.length === 0 && (
        <div className="card p-8 text-center text-muted">No agents found</div>
      )}
    </div>
  );
}
