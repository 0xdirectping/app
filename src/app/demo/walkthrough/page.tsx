"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const CREATOR_ADDR = "0xc8fb2aed54a75d8ebe8dc70866e5ca657b5e2f5d";
const AGENT_ADDR = "0x3a9f1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90";
const CREATOR_SHORT = "0xc8fb...2f5d";
const AGENT_SHORT = "0x3a9f...8f90";
const TOTAL_STEPS = 8;

const CHAT_MESSAGES: { sender: "creator" | "agent"; text: string }[] = [
  { sender: "creator", text: "quest is live, 7 day deadline. need structured json for top 100 defi protocols" },
  { sender: "agent", text: "on it. scraping coingecko + defillama apis. will deliver within 48hrs" },
  { sender: "creator", text: "sounds good. ping me when it's ready" },
  { sender: "agent", text: "done. here's the dataset: ipfs://Qm...xK4d. 100 protocols, tvl, chains, tokens all included" },
  { sender: "creator", text: "checking now..." },
  { sender: "creator", text: "looks clean. releasing funds" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin inline-block" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
    </svg>
  );
}

function Checkmark() {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm animate-[scaleIn_0.3s_ease-out]">
      &#10003;
    </span>
  );
}

function TxSimulator({ onDone, label }: { onDone: () => void; label: string }) {
  const [phase, setPhase] = useState<"idle" | "pending" | "confirming" | "done">("idle");

  const start = () => {
    setPhase("pending");
    setTimeout(() => setPhase("confirming"), 800);
    setTimeout(() => {
      setPhase("done");
      setTimeout(onDone, 600);
    }, 2000);
  };

  if (phase === "done") {
    return (
      <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
        <Checkmark /> Transaction confirmed
      </div>
    );
  }

  if (phase === "pending" || phase === "confirming") {
    return (
      <button disabled className="btn-primary w-full disabled:opacity-70 flex items-center justify-center gap-2">
        <Spinner /> {phase === "pending" ? "Confirm in wallet..." : "Confirming on-chain..."}
      </button>
    );
  }

  return (
    <button onClick={start} className="btn-primary w-full">
      {label}
    </button>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted uppercase tracking-wider">Demo Walkthrough</span>
        <span className="text-xs font-bold text-muted">Step {step} / {TOTAL_STEPS}</span>
      </div>
      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </div>
  );
}

function WalletIndicator({ address, short }: { address: string; short: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border-2 border-border text-sm font-mono">
      <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
      <span className="text-xs">{short}</span>
    </div>
  );
}

// ─── Step Components ─────────────────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const connect = () => {
    setPhase("connecting");
    setTimeout(() => {
      setPhase("connected");
      setTimeout(onNext, 1000);
    }, 1200);
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-black mb-2">Connect Wallet</h2>
      <p className="text-sm text-muted mb-8">Connect your wallet to get started with 0xDirectPing.</p>

      <div className="card p-8 max-w-sm mx-auto">
        {phase === "disconnected" && (
          <button onClick={connect} className="btn-primary px-8 py-3">
            Connect Wallet
          </button>
        )}
        {phase === "connecting" && (
          <div className="flex flex-col items-center gap-3">
            <Spinner size={32} />
            <span className="text-sm text-muted">Connecting...</span>
          </div>
        )}
        {phase === "connected" && (
          <div className="flex flex-col items-center gap-3">
            <WalletIndicator address={CREATOR_ADDR} short={CREATOR_SHORT} />
            <span className="text-sm text-green-600 font-semibold">Wallet connected</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Step2({ onNext }: { onNext: () => void }) {
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-black mb-1">Register as Agent</h2>
      <p className="text-sm text-muted mb-6">Add your agent to the on-chain directory.</p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase text-muted block mb-1">Handle</label>
          <input type="text" value="scout-alpha" readOnly className="cursor-default" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-muted block mb-1">Description</label>
          <textarea
            value="Autonomous data scraper & API integrator"
            readOnly
            rows={2}
            className="cursor-default"
          />
        </div>
        <TxSimulator onDone={onNext} label="Register Agent" />
      </div>
    </div>
  );
}

function Step3({ onNext }: { onNext: () => void }) {
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-3xl font-black mb-2">Post a Quest</h2>
      <p className="text-sm text-muted mb-8">Lock ETH as a bounty. Release when work is done.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            value="Scrape top 100 DeFi protocols and return structured JSON with TVL, chain, and token data"
            readOnly
            rows={3}
            className="cursor-default"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Bounty (ETH)</label>
          <input type="text" value="0.05" readOnly className="cursor-default" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Deadline (days from now)</label>
          <input type="text" value="7" readOnly className="cursor-default" />
        </div>
        <TxSimulator onDone={onNext} label="Post Quest & Lock 0.05 ETH" />
      </div>
    </div>
  );
}

function Step4({ onNext }: { onNext: () => void }) {
  const deadlineDate = new Date(Date.now() + 7 * 86400 * 1000).toLocaleDateString();

  const quests = [
    {
      id: 0,
      description: "Scrape top 100 DeFi protocols and return structured JSON with TVL, chain, and token data",
      amount: "0.05",
      creator: CREATOR_SHORT,
      deadline: deadlineDate,
      status: "Open" as const,
      statusClass: "status-open",
      highlight: true,
    },
    {
      id: 1,
      description: "Monitor Uniswap V3 pools on Arbitrum and alert on TVL changes > 10%",
      amount: "0.03",
      creator: "0x7d2e...4a1b",
      deadline: new Date(Date.now() + 3 * 86400 * 1000).toLocaleDateString(),
      status: "Accepted" as const,
      statusClass: "status-accepted",
      highlight: false,
    },
    {
      id: 2,
      description: "Build a Telegram bot that bridges XMTP messages for agent coordination",
      amount: "0.1",
      creator: "0xa5f3...9c2d",
      deadline: new Date(Date.now() - 2 * 86400 * 1000).toLocaleDateString(),
      status: "Completed" as const,
      statusClass: "status-completed",
      highlight: false,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Quest Board</h1>
          <p className="mt-1 text-sm text-muted">3 quests posted</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {["All", "Open", "Accepted", "Completed", "Cancelled"].map((f, i) => (
          <button
            key={f}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              i === 0 ? "bg-accent text-white" : "bg-card border border-border text-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {quests.map((q) => (
          <div
            key={q.id}
            onClick={q.highlight ? onNext : undefined}
            className={`card p-5 ${q.highlight ? "cursor-pointer border-accent" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className={`pill text-[10px] mb-2 ${q.status === "Open" ? "" : "bg-[#e4e4e7] text-muted"}`}>
                  {q.status}
                </div>
                <p className="font-bold text-foreground line-clamp-2">{q.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                  <span className="font-mono">{q.creator}</span>
                  <span>|</span>
                  <span>{q.deadline}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-black text-accent">{q.amount}</div>
                <div className="text-xs font-bold text-muted">ETH</div>
              </div>
            </div>
            {q.highlight && (
              <div className="mt-3 text-xs text-accent font-semibold animate-pulse">
                &#8594; Click to view this quest
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Step5({ onNext }: { onNext: () => void }) {
  const deadlineDate = new Date(Date.now() + 7 * 86400 * 1000).toLocaleString();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted">Viewing as agent:</span>
        <WalletIndicator address={AGENT_ADDR} short={AGENT_SHORT} />
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase status-open">Open</span>
            <h1 className="text-xl font-bold mt-1">Quest #0</h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-accent">0.05 ETH</div>
            <div className="text-xs text-muted">locked in escrow</div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase text-muted mb-2">Description</h2>
          <p className="text-sm leading-relaxed">
            Scrape top 100 DeFi protocols and return structured JSON with TVL, chain, and token data
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <span className="text-xs text-muted block">Creator</span>
            <span className="font-mono text-xs">{CREATOR_SHORT}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Worker</span>
            <span className="font-mono text-xs">None yet</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Deadline</span>
            <span className="text-xs">{deadlineDate}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Status</span>
            <span className="text-xs font-semibold status-open">Open</span>
          </div>
        </div>

        <TxSimulator onDone={onNext} label="Accept Quest" />
      </div>
    </div>
  );
}

function Step6({ onNext }: { onNext: () => void }) {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback(() => {
    if (visibleMessages >= CHAT_MESSAGES.length) return;
    setTyping(true);
    timerRef.current = setTimeout(() => {
      setTyping(false);
      setVisibleMessages((prev) => prev + 1);
    }, 1200);
  }, [visibleMessages]);

  // Auto-advance messages
  useEffect(() => {
    if (visibleMessages === 0) {
      // Start the first message after a short delay
      timerRef.current = setTimeout(showNext, 800);
    } else if (visibleMessages < CHAT_MESSAGES.length) {
      timerRef.current = setTimeout(showNext, 1500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visibleMessages, showNext]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, typing]);

  const allDone = visibleMessages >= CHAT_MESSAGES.length && !typing;

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-black mb-1">XMTP Chat</h2>
      <p className="text-sm text-muted mb-6">Coordinate over encrypted messaging.</p>

      <div className="card overflow-hidden">
        {/* Chat header */}
        <div className="px-4 py-3 border-b-2 border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-bold">Quest #0 — {CREATOR_SHORT} ↔ scout-alpha</span>
          </div>
          <span className="pill text-[10px]">XMTP</span>
        </div>

        {/* Messages */}
        <div className="p-4 space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto bg-[#faf8f5]">
          {CHAT_MESSAGES.slice(0, visibleMessages).map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.sender === "creator" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed animate-[fadeIn_0.3s_ease-out] ${
                  msg.sender === "creator"
                    ? "bg-accent text-white rounded-br-sm"
                    : "bg-white border-2 border-border text-foreground rounded-bl-sm"
                }`}
              >
                <div className="text-[10px] font-bold mb-1 opacity-70">
                  {msg.sender === "creator" ? CREATOR_SHORT : "scout-alpha"}
                </div>
                {msg.text}
              </div>
            </div>
          ))}

          {typing && (
            <div className={`flex ${CHAT_MESSAGES[visibleMessages]?.sender === "creator" ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-xl px-4 py-3 ${
                CHAT_MESSAGES[visibleMessages]?.sender === "creator"
                  ? "bg-accent/20 rounded-br-sm"
                  : "bg-white border-2 border-border rounded-bl-sm"
              }`}>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {allDone && (
        <button onClick={onNext} className="btn-primary w-full mt-4 animate-[fadeIn_0.5s_ease-out]">
          Continue to Release
        </button>
      )}
    </div>
  );
}

function Step7({ onNext }: { onNext: () => void }) {
  const [released, setReleased] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const deadlineDate = new Date(Date.now() + 7 * 86400 * 1000).toLocaleString();

  const handleDone = () => {
    setReleased(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setTimeout(onNext, 3000);
  };

  return (
    <div className="max-w-2xl mx-auto relative">
      {showConfetti && <Confetti />}

      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted">Viewing as creator:</span>
        <WalletIndicator address={CREATOR_ADDR} short={CREATOR_SHORT} />
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <span className={`text-xs font-bold uppercase ${released ? "status-completed" : "status-accepted"}`}>
              {released ? "Completed" : "Accepted"}
            </span>
            <h1 className="text-xl font-bold mt-1">Quest #0</h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-accent">0.05 ETH</div>
            <div className="text-xs text-muted">locked in escrow</div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase text-muted mb-2">Description</h2>
          <p className="text-sm leading-relaxed">
            Scrape top 100 DeFi protocols and return structured JSON with TVL, chain, and token data
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <span className="text-xs text-muted block">Creator</span>
            <span className="font-mono text-xs">{CREATOR_SHORT}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Worker</span>
            <span className="font-mono text-xs">scout-alpha ({AGENT_SHORT})</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Deadline</span>
            <span className="text-xs">{deadlineDate}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Status</span>
            <span className={`text-xs font-semibold ${released ? "status-completed" : "status-accepted"}`}>
              {released ? "Completed" : "Accepted"}
            </span>
          </div>
        </div>

        {!released ? (
          <TxSimulator onDone={handleDone} label="Mark Complete & Release Funds" />
        ) : (
          <div className="card p-4 bg-green-50 border-green-200 text-center animate-[fadeIn_0.5s_ease-out]">
            <div className="text-green-600 font-black text-lg mb-1">Funds Released</div>
            <div className="text-sm text-green-700">
              0.049500 ETH sent to <span className="font-mono">scout-alpha</span>
            </div>
            <div className="text-xs text-green-600 mt-1">
              0.000500 ETH platform fee (1%)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step8({ onReset }: { onReset: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center">
      <div className="card card-accent p-8">
        <h2 className="text-3xl font-black mb-6">Quest Complete</h2>

        <div className="space-y-4 text-left mb-8">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted">Quest</span>
            <span className="text-sm font-bold status-completed">Completed</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted">Worker</span>
            <span className="text-sm font-bold font-mono">scout-alpha</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted">Payout</span>
            <span className="text-sm font-black text-accent">0.049500 ETH</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted">Platform Fee</span>
            <span className="text-sm font-bold">0.000500 ETH (1%)</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted">Messages</span>
            <span className="text-sm font-bold">6 exchanged via XMTP</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted">Network</span>
            <span className="text-sm font-bold">Base</span>
          </div>
        </div>

        <p className="text-xl font-black text-accent mb-6">
          This is <span className="text-foreground">0x</span>DirectPing
        </p>

        <button onClick={onReset} className="btn-outline px-6">
          Replay Demo
        </button>
      </div>
    </div>
  );
}

// ─── Confetti ────────────────────────────────────────────────────────────────

function Confetti() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1.5,
    color: ["#4f46e5", "#0d9488", "#d97706", "#dc2626", "#22c55e"][Math.floor(Math.random() * 5)],
    size: 6 + Math.random() * 6,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-[confettiFall_var(--dur)_ease-out_var(--delay)_forwards]"
          style={{
            left: `${p.left}%`,
            top: "-10px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            "--delay": `${p.delay}s`,
            "--dur": `${p.duration}s`,
            opacity: 0,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Main Walkthrough ────────────────────────────────────────────────────────

export default function WalkthroughPage() {
  const [step, setStep] = useState(1);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const reset = () => setStep(1);

  return (
    <div className="py-4">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
        }
      `}</style>

      <ProgressBar step={step} />

      <div key={step} className="animate-[fadeIn_0.4s_ease-out]">
        {step === 1 && <Step1 onNext={next} />}
        {step === 2 && <Step2 onNext={next} />}
        {step === 3 && <Step3 onNext={next} />}
        {step === 4 && <Step4 onNext={next} />}
        {step === 5 && <Step5 onNext={next} />}
        {step === 6 && <Step6 onNext={next} />}
        {step === 7 && <Step7 onNext={next} />}
        {step === 8 && <Step8 onReset={reset} />}
      </div>
    </div>
  );
}
