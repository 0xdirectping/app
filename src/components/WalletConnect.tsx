"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletConnect() {
  return (
    <div className="card p-8 text-center">
      <p className="text-muted mb-4">Connect your wallet to continue</p>
      <ConnectButton />
    </div>
  );
}
