import type { Request, Response } from "express";
import { QuestStatus, STATUS_LABELS } from "@0xdirectping/sdk";
import type { ApiConfig } from "../config.js";
import { getReadOnlyEscrow, getWriteEscrow } from "../shared/escrow.js";
import { getLogger } from "../shared/logger.js";
import type { CancelQuestInput } from "./schemas.js";

export function cancelQuestHandler(config: ApiConfig) {
  const logger = getLogger();

  return async (req: Request, res: Response) => {
    const { questId } = req.body as CancelQuestInput;

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

      if (quest.status !== QuestStatus.Open) {
        res.status(400).json({
          error: `Quest status is ${STATUS_LABELS[quest.status]}, must be Open to cancel`,
        });
        return;
      }

      // Execute on-chain
      const txHash = await writeEscrow.cancelQuest(questId);
      await writeEscrow.waitForTransaction(txHash);

      logger.info({ questId, txHash }, "Quest cancelled via x402");

      res.json({ questId, txHash });
    } catch (err) {
      logger.error({ err: String(err) }, "x402 cancel-quest failed");
      res.status(500).json({ error: "Failed to cancel quest" });
    }
  };
}
