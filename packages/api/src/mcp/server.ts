import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import {
  ESCROW_ADDRESS,
  ZERO_ADDRESS,
  STATUS_LABELS,
  QuestStatus,
} from "@0xdirectping/sdk";
import { formatEther, formatUnits } from "viem";
import { getReadOnlyEscrow } from "../shared/escrow.js";
import { getLogger } from "../shared/logger.js";

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: msg }],
    isError: true as const,
  };
}

export function createMcpServer(rpcUrl: string): McpServer {
  const server = new McpServer({
    name: "0xDirectPing",
    version: "0.1.0",
  });

  const escrow = getReadOnlyEscrow(rpcUrl);
  const logger = getLogger();

  // ── Tool handlers ─────────────────────────────────────────────────
  // Defined separately to avoid TS2589 deep type instantiation in McpServer generics

  async function handleGetQuest({ questId }: { questId: number }) {
    try {
      const quest = await escrow.getQuest(questId);
      const isETH = quest.token === ZERO_ADDRESS;
      return textResult({
        id: quest.id,
        creator: quest.creator,
        worker: quest.worker,
        amount: isETH
          ? `${formatEther(quest.amount)} ETH`
          : `${formatUnits(quest.amount, 6)} USDC`,
        description: quest.description,
        deadline: new Date(Number(quest.deadline) * 1000).toISOString(),
        status: STATUS_LABELS[quest.status],
        token: isETH ? "ETH" : "USDC",
        contractAddress: ESCROW_ADDRESS,
      });
    } catch (err) {
      logger.error({ err: String(err) }, "MCP get_quest failed");
      return errorResult(`Error: Quest ${questId} not found`);
    }
  }

  async function handleListOpenQuests({ limit }: { limit: number }) {
    try {
      const count = await escrow.getQuestCount();
      const openQuests = [];

      for (let i = 0; i < count && openQuests.length < limit; i++) {
        try {
          const quest = await escrow.getQuest(i);
          if (quest.status === QuestStatus.Open) {
            const isETH = quest.token === ZERO_ADDRESS;
            openQuests.push({
              id: quest.id,
              description: quest.description,
              amount: isETH
                ? `${formatEther(quest.amount)} ETH`
                : `${formatUnits(quest.amount, 6)} USDC`,
              deadline: new Date(Number(quest.deadline) * 1000).toISOString(),
              creator: quest.creator,
            });
          }
        } catch {
          // Skip individual quest errors
        }
      }

      return textResult({ total: count, openQuests, showing: openQuests.length });
    } catch (err) {
      logger.error({ err: String(err) }, "MCP list_open_quests failed");
      return errorResult("Error listing quests");
    }
  }

  async function handleGetAgent({ address }: { address: string }) {
    try {
      const agent = await escrow.getAgent(address as `0x${string}`);
      if (!agent.handle) {
        return textResult({ message: `No agent registered at ${address}` });
      }
      return textResult({
        address,
        handle: agent.handle,
        description: agent.description,
        registeredAt: new Date(Number(agent.registeredAt) * 1000).toISOString(),
      });
    } catch (err) {
      logger.error({ err: String(err) }, "MCP get_agent failed");
      return errorResult(`Error: Agent not found at ${address}`);
    }
  }

  async function handleGetStats() {
    try {
      const [questCount, agentCount, feeBps] = await Promise.all([
        escrow.getQuestCount(),
        escrow.getAgentCount(),
        escrow.getFeeBps(),
      ]);

      return textResult({
        questCount,
        agentCount,
        platformFeeBps: feeBps,
        platformFeePercent: `${feeBps / 100}%`,
        contractAddress: ESCROW_ADDRESS,
        network: "Base (mainnet)",
      });
    } catch (err) {
      logger.error({ err: String(err) }, "MCP get_stats failed");
      return errorResult("Error fetching platform stats");
    }
  }

  // ── Register tools (read-only) ────────────────────────────────────
  // Cast to any to avoid TS2589 deep type instantiation from MCP SDK + Zod generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = server as any;

  s.tool("get_quest", "Get details of a specific quest by ID",
    { questId: z.number().int().min(0) }, handleGetQuest);

  s.tool("list_open_quests", "List all quests with Open status",
    { limit: z.number().int().min(1).max(50).default(20) }, handleListOpenQuests);

  s.tool("get_agent", "Get details of a registered agent by wallet address",
    { address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }, handleGetAgent);

  s.tool("get_stats", "Get platform statistics (quest count, agent count, fee)",
    handleGetStats);

  // ── Resources ─────────────────────────────────────────────────────

  server.resource("quests", "escrow://quests", async () => {
    const count = await escrow.getQuestCount();
    const quests = [];
    for (let i = 0; i < count; i++) {
      try {
        const quest = await escrow.getQuest(i);
        const isETH = quest.token === ZERO_ADDRESS;
        quests.push({
          id: quest.id,
          creator: quest.creator,
          worker: quest.worker,
          amount: isETH
            ? `${formatEther(quest.amount)} ETH`
            : `${formatUnits(quest.amount, 6)} USDC`,
          description: quest.description,
          deadline: new Date(Number(quest.deadline) * 1000).toISOString(),
          status: STATUS_LABELS[quest.status],
        });
      } catch {
        // Skip
      }
    }
    return {
      contents: [
        {
          uri: "escrow://quests",
          mimeType: "application/json",
          text: JSON.stringify(quests, null, 2),
        },
      ],
    };
  });

  server.resource("agents", "escrow://agents", async () => {
    const count = await escrow.getAgentCount();
    const agents = [];
    for (let i = 0; i < count; i++) {
      try {
        const addr = await escrow.getAgentByIndex(i);
        const agent = await escrow.getAgent(addr);
        agents.push({
          address: addr,
          handle: agent.handle,
          description: agent.description,
          registeredAt: new Date(Number(agent.registeredAt) * 1000).toISOString(),
        });
      } catch {
        // Skip
      }
    }
    return {
      contents: [
        {
          uri: "escrow://agents",
          mimeType: "application/json",
          text: JSON.stringify(agents, null, 2),
        },
      ],
    };
  });

  server.resource("stats", "escrow://stats", async () => {
    const [questCount, agentCount, feeBps] = await Promise.all([
      escrow.getQuestCount(),
      escrow.getAgentCount(),
      escrow.getFeeBps(),
    ]);
    return {
      contents: [
        {
          uri: "escrow://stats",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              questCount,
              agentCount,
              platformFeeBps: feeBps,
              contractAddress: ESCROW_ADDRESS,
              network: "Base",
            },
            null,
            2,
          ),
        },
      ],
    };
  });

  return server;
}
