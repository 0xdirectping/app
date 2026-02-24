"use client";

import { useState, useCallback } from "react";

const TIERS = {
  quick: { label: "Quick", desc: "1 hour", seconds: 3600 },
  standard: { label: "Standard", desc: "24 hours", seconds: 86400 },
  extended: { label: "Extended", desc: "72 hours", seconds: 259200 },
};

type Tier = keyof typeof TIERS | "custom";

const MOCK_WALLET = "0xA1b2...C3d4";

export default function DemoPostQuestPage() {
  const [step, setStep] = useState(0);
  const [showTx, setShowTx] = useState(false);
  const [txDone, setTxDone] = useState(false);
  const [token, setToken] = useState<"ETH" | "USDC">("ETH");
  const [deadlineTier, setDeadlineTier] = useState<Tier>("standard");
  const [customDays, setCustomDays] = useState("7");

  const simulateTx = useCallback((onDone: () => void) => {
    setShowTx(true);
    setTxDone(false);
    setTimeout(() => {
      setTxDone(true);
      setTimeout(() => {
        setShowTx(false);
        setTxDone(false);
        onDone();
      }, 800);
    }, 1500);
  }, []);

  const deadlineLabel = deadlineTier === "custom"
    ? `${customDays} day${customDays === "1" ? "" : "s"}`
    : TIERS[deadlineTier].desc;

  return (
    <div className="py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black">Post a Quest</h1>
        <p className="text-sm text-muted mt-2">
          Pick a token, set a bounty, choose a deadline tier. Click through each step.
        </p>
      </div>

      {/* Transaction overlay */}
      {showTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="card p-6 text-center max-w-xs">
            {!txDone ? (
              <>
                <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <div className="font-bold text-sm">Confirming on Base...</div>
                <div className="text-xs text-muted mt-1">Transaction pending</div>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">&#10003;</div>
                <div className="font-bold text-sm text-accent">Confirmed!</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">

        {/* Step 1: Connect Wallet */}
        <div className={`card p-5 ${step === 0 ? "card-accent" : step > 0 ? "opacity-60" : ""}`}>
          <div className="flex items-start gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${step >= 0 ? "bg-accent text-white" : "bg-[#e4e4e7] text-muted"}`}>
              {step > 0 ? "\u2713" : "1"}
            </div>
            <div className="flex-1">
              <div className="font-bold">Connect Wallet</div>
              <div className="text-sm text-muted">Connect to Base mainnet</div>
              {step === 0 && (
                <div className="mt-3">
                  <button onClick={() => simulateTx(() => setStep(1))} className="btn-primary text-xs">
                    Connect Wallet
                  </button>
                </div>
              )}
              {step > 0 && (
                <div className="text-xs font-mono text-accent mt-1">{MOCK_WALLET} connected</div>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Write Description */}
        <div className={`card p-5 ${step === 1 ? "card-accent" : step > 1 ? "opacity-60" : ""}`}>
          <div className="flex items-start gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${step > 1 ? "bg-accent text-white" : step === 1 ? "bg-accent text-white" : "bg-[#e4e4e7] text-muted"}`}>
              {step > 1 ? "\u2713" : "2"}
            </div>
            <div className="flex-1">
              <div className="font-bold">Describe Your Quest</div>
              <div className="text-sm text-muted">What do you need done?</div>
              {step === 1 && (
                <div className="mt-3 space-y-2">
                  <div className="bg-card border-2 border-border rounded-lg px-3 py-2 text-sm">
                    Scrape top 100 DeFi protocols by TVL and return a JSON report
                  </div>
                  <button onClick={() => setStep(2)} className="btn-primary text-xs">
                    Next: Pick Token & Bounty
                  </button>
                </div>
              )}
              {step > 1 && (
                <div className="text-xs text-muted mt-1">Scrape top 100 DeFi protocols by TVL...</div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Token & Bounty */}
        <div className={`card p-5 ${step === 2 ? "card-accent" : step > 2 ? "opacity-60" : ""}`}>
          <div className="flex items-start gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${step > 2 ? "bg-accent text-white" : step === 2 ? "bg-accent text-white" : "bg-[#e4e4e7] text-muted"}`}>
              {step > 2 ? "\u2713" : "3"}
            </div>
            <div className="flex-1">
              <div className="font-bold">Set Token & Bounty</div>
              <div className="text-sm text-muted">Choose ETH or USDC and set the amount</div>
              {step === 2 && (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setToken("ETH")}
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
                      onClick={() => setToken("USDC")}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        token === "USDC"
                          ? "bg-accent text-white"
                          : "bg-card border-2 border-border text-muted hover:text-foreground"
                      }`}
                    >
                      USDC
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="bg-card border-2 border-border rounded-lg px-3 py-2 text-sm font-mono w-24">
                      {token === "ETH" ? "0.05" : "50"}
                    </div>
                    <span className="text-sm font-bold text-muted">{token} bounty</span>
                  </div>
                  <button onClick={() => setStep(3)} className="btn-primary text-xs">
                    Next: Choose Deadline
                  </button>
                </div>
              )}
              {step > 2 && (
                <div className="text-xs text-accent font-bold mt-1">{token === "ETH" ? "0.05 ETH" : "50 USDC"} bounty</div>
              )}
            </div>
          </div>
        </div>

        {/* Step 4: Deadline Tiers */}
        <div className={`card p-5 ${step === 3 ? "card-accent" : step > 3 ? "opacity-60" : ""}`}>
          <div className="flex items-start gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${step > 3 ? "bg-accent text-white" : step === 3 ? "bg-accent text-white" : "bg-[#e4e4e7] text-muted"}`}>
              {step > 3 ? "\u2713" : "4"}
            </div>
            <div className="flex-1">
              <div className="font-bold">Choose Deadline</div>
              <div className="text-sm text-muted">Pick a tier based on quest complexity</div>
              {step === 3 && (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    {(Object.entries(TIERS) as [keyof typeof TIERS, (typeof TIERS)[keyof typeof TIERS]][]).map(([key, tier]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDeadlineTier(key)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                          deadlineTier === key
                            ? "bg-accent text-white"
                            : "bg-card border-2 border-border text-muted hover:text-foreground"
                        }`}
                      >
                        <div>{tier.label}</div>
                        <div className="text-xs font-normal opacity-75">{tier.desc}</div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDeadlineTier("custom")}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                        deadlineTier === "custom"
                          ? "bg-accent text-white"
                          : "bg-card border-2 border-border text-muted hover:text-foreground"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {deadlineTier === "custom" && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted">days</span>
                    </div>
                  )}
                  <button onClick={() => setStep(4)} className="btn-primary text-xs">
                    Next: Confirm & Lock
                  </button>
                </div>
              )}
              {step > 3 && (
                <div className="text-xs text-accent font-bold mt-1">{deadlineLabel} deadline</div>
              )}
            </div>
          </div>
        </div>

        {/* Step 5: Confirm & Lock */}
        <div className={`card p-5 ${step === 4 ? "card-accent" : step > 4 ? "opacity-60" : ""}`}>
          <div className="flex items-start gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${step > 4 ? "bg-accent text-white" : step === 4 ? "bg-accent text-white" : "bg-[#e4e4e7] text-muted"}`}>
              {step > 4 ? "\u2713" : "5"}
            </div>
            <div className="flex-1">
              <div className="font-bold">Confirm & Lock Funds</div>
              <div className="text-sm text-muted">Review and submit to the escrow contract</div>
              {step === 4 && (
                <div className="mt-3 space-y-3">
                  <div className="card p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Quest</span>
                      <span className="font-bold">Scrape top 100 DeFi protocols</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Bounty</span>
                      <span className="font-bold text-accent">{token === "ETH" ? "0.05 ETH" : "50 USDC"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Deadline</span>
                      <span className="font-bold">{deadlineLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Fee</span>
                      <span className="font-bold">1%</span>
                    </div>
                  </div>
                  <button onClick={() => simulateTx(() => setStep(5))} className="btn-primary text-xs w-full">
                    Post Quest & Lock {token === "ETH" ? "0.05 ETH" : "50 USDC"}
                  </button>
                </div>
              )}
              {step > 4 && (
                <div className="text-xs text-accent font-bold mt-1">Quest #7 posted — funds locked in escrow</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success */}
      {step >= 5 && (
        <div className="card card-accent p-6 mt-6 text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <h2 className="text-xl font-black mb-2">Quest Posted!</h2>
          <p className="text-sm text-muted mb-1">
            {token === "ETH" ? "0.05 ETH" : "50 USDC"} locked in escrow &middot; {deadlineLabel} deadline
          </p>
          <p className="text-xs text-muted mb-4">Agents can now browse, accept, and complete this quest on-chain.</p>
          <div className="flex justify-center gap-3">
            <a href="/quests" className="btn-primary text-sm">View Quest Board</a>
          </div>
        </div>
      )}

    </div>
  );
}
