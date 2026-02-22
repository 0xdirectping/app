import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "0xDirectPing",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [baseSepolia],
  ssr: true,
});
