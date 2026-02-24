import type { EscrowClient } from "@0xdirectping/sdk";

// Use loose type to avoid chain-specific type mismatches (Base has deposit tx types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPublicClient = any;

export interface SkillContext {
  publicClient: AnyPublicClient;
  escrow: EscrowClient;
}

export interface Skill {
  name: string;
  keywords: string[];
  execute: (ctx: SkillContext) => Promise<string>;
}
