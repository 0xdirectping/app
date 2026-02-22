"use client";

import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { useWalletClient } from "wagmi";
import { toBytes } from "viem";

interface XMTPChatProps {
  peerAddress: string;
}

type Message = {
  id: string;
  content: string;
  fromMe: boolean;
  timestamp: Date;
};

export function XMTPChat({ peerAddress }: XMTPChatProps) {
  const { data: walletClient } = useWalletClient();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const clientRef = useRef<unknown>(null);
  const dmRef = useRef<unknown>(null);

  const connect = useCallback(async () => {
    if (!walletClient || status === "connecting" || status === "connected") return;
    setStatus("connecting");
    setErrorMsg("");

    try {
      const { Client, IdentifierKind } = await import("@xmtp/browser-sdk");

      const [address] = await walletClient.getAddresses();

      const signer = {
        type: "EOA" as const,
        getIdentifier: () => ({
          identifier: address,
          identifierKind: IdentifierKind.Ethereum,
        }),
        signMessage: async (msg: string) => {
          const sig = await walletClient.signMessage({ account: address, message: msg });
          return toBytes(sig);
        },
      };

      const client = await Client.create(signer);
      clientRef.current = client;

      // Check if peer can receive messages
      const canMsg = await client.canMessage([
        { identifier: peerAddress, identifierKind: IdentifierKind.Ethereum },
      ]);

      if (!canMsg.get(peerAddress.toLowerCase())) {
        setStatus("error");
        setErrorMsg("This address is not on the XMTP network yet.");
        return;
      }

      // Find or create DM
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convos = (client as any).conversations;
      const peer = { identifier: peerAddress, identifierKind: IdentifierKind.Ethereum };
      const dm = (await convos.findDmByIdentifier(peer)) ?? (await convos.createDm(peer));

      dmRef.current = dm;
      setStatus("connected");
    } catch (err) {
      console.error("XMTP connection error:", err);
      setStatus("error");
      setErrorMsg("Failed to connect to XMTP. Try again.");
    }
  }, [walletClient, peerAddress, status]);

  const handleSend = async () => {
    if (!message.trim() || !dmRef.current) return;
    setSending(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (dmRef.current as any).sendText(message);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), content: message, fromMe: true, timestamp: new Date() },
      ]);
      setMessage("");
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setSending(false);
    }
  };

  if (!walletClient) {
    return (
      <div className="card p-4">
        <p className="text-sm text-muted">Connect wallet to message via XMTP</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Message via XMTP</h3>
        <a
          href={`https://converse.xyz/dm/${peerAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline"
        >
          Open in Converse
        </a>
      </div>
      <p className="text-xs text-muted mb-3 font-mono">
        To: {peerAddress.slice(0, 6)}...{peerAddress.slice(-4)}
      </p>

      {status === "idle" && (
        <button onClick={connect} className="btn-primary text-sm w-full py-2">
          Connect to XMTP
        </button>
      )}

      {status === "connecting" && (
        <p className="text-sm text-muted text-center py-2">Connecting to XMTP... (sign the message in your wallet)</p>
      )}

      {status === "error" && (
        <div>
          <p className="text-sm text-danger mb-2">{errorMsg}</p>
          <button onClick={() => { setStatus("idle"); }} className="btn-outline text-xs">
            Try Again
          </button>
        </div>
      )}

      {status === "connected" && (
        <>
          {messages.length > 0 && (
            <div className="mb-3 max-h-48 overflow-y-auto space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className={`text-sm p-2 rounded-lg ${msg.fromMe ? "bg-accent/10 text-right" : "bg-card"}`}>
                  <p>{msg.content}</p>
                  <span className="text-[10px] text-muted">{msg.timestamp.toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="flex-1 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="btn-primary px-3 py-2 flex items-center gap-1.5 text-sm disabled:opacity-50"
            >
              <Send size={14} />
              {sending ? "..." : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
