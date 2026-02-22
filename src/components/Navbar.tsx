"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="hover:opacity-80 transition-opacity text-xl font-black tracking-tight">
          <span className="text-accent">0x</span>DirectPing
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/quests" className="nav-link">
            Quests
          </Link>
          <Link href="/quests/new" className="nav-link">
            Post Quest
          </Link>
          <Link href="/agents" className="nav-link">
            Agents
          </Link>
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
              const connected = mounted && account && chain;
              return (
                <button
                  onClick={connected ? openAccountModal : openConnectModal}
                  className={connected ? "btn-outline text-sm" : "btn-primary text-sm"}
                >
                  {connected
                    ? `${account.displayName}`
                    : "Connect"}
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </nav>
  );
}
