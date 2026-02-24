import type { Request, Response } from "express";
import { formatEther, formatUnits } from "viem";
import { ZERO_ADDRESS, QuestStatus, STATUS_LABELS } from "@0xdirectping/sdk";
import type { ApiConfig } from "../config.js";
import { getReadOnlyEscrow, getWriteEscrow } from "../shared/escrow.js";
import { getLogger } from "../shared/logger.js";
import type { CompleteQuestInput } from "./schemas.js";

export function completeQuestHandler(config: ApiConfig) {
  const logger = getLogger();

  return async (req: Request, res: Response) => {
    const { questId } = req.body as CompleteQuestInput;

    try {
      const readEscrow = getReadOnlyEscrow(config.baseRpcUrl, config.baseRpcUrlFallback);
      const writeEscrow = getWriteEscrow(config.walletKey, config.baseRpcUrl, config.baseRpcUrlFallback);
      const platformAddr =
        writeEscrow.walletClient.account!.address.toLowerCase();

      // Fetch quest and validate
      let quest;
      try {
        quest = await readEscrow.getQuest(questId);
      } catch {
        res.status(404).json({ error: `Quest ${questId} not found` });
        return;
      }

      if (quest.creator.toLowerCase() !== platformAddr) {
        res.status(403).json({
          error: "Quest was not created by the platform wallet",
        });
        return;
      }

      if (quest.status !== QuestStatus.Accepted) {
        res.status(400).json({
          error: `Quest status is ${STATUS_LABELS[quest.status]}, must be Accepted to complete`,
        });
        return;
      }

      // Execute on-chain
      const txHash = await writeEscrow.completeQuest(questId);
      await writeEscrow.waitForTransaction(txHash);

      const isETH = quest.token === ZERO_ADDRESS;
      const payoutAmount = isETH
        ? `${formatEther(quest.amount)} ETH`
        : `${formatUnits(quest.amount, 6)} USDC`;

      logger.info({ questId, txHash }, "Quest completed via x402");

      res.json({ questId, txHash, payoutAmount });
    } catch (err) {
      logger.error({ err: String(err) }, "x402 complete-quest failed");
      res.status(500).json({ error: "Failed to complete quest" });
    }
  };
}
