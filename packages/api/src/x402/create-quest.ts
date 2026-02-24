import type { Request, Response } from "express";
import { parseEther, parseUnits, decodeEventLog, type Hex } from "viem";
import { ESCROW_ABI, USDC_ADDRESS, ZERO_ADDRESS } from "@0xdirectping/sdk";
import type { ApiConfig } from "../config.js";
import { getPublicClient, getWriteEscrow } from "../shared/escrow.js";
import { getLogger } from "../shared/logger.js";
import { isReplayed, markUsed } from "./replay-guard.js";
import { suggestDeadline, tierToSeconds } from "../shared/deadline.js";
import type { CreateQuestInput } from "./schemas.js";

// Amount caps
const MAX_ETH = parseEther("1"); // 1 ETH
const MAX_USDC = parseUnits("1000", 6); // 1000 USDC

// ERC-20 Transfer event signature
const TRANSFER_EVENT = {
  type: "event" as const,
  name: "Transfer" as const,
  inputs: [
    { type: "address", name: "from", indexed: true },
    { type: "address", name: "to", indexed: true },
    { type: "uint256", name: "value", indexed: false },
  ],
} as const;

export function createQuestHandler(config: ApiConfig) {
  const logger = getLogger();

  return async (req: Request, res: Response) => {
    const input = req.body as CreateQuestInput;

    try {
      // 1. Parse and validate amount
      const isETH = input.token === "ETH";
      let amount: bigint;
      try {
        amount = isETH
          ? parseEther(input.amount)
          : parseUnits(input.amount, 6);
      } catch {
        res.status(400).json({ error: "Invalid amount format" });
        return;
      }

      if (amount <= 0n) {
        res.status(400).json({ error: "Amount must be positive" });
        return;
      }

      const maxAmount = isETH ? MAX_ETH : MAX_USDC;
      if (amount > maxAmount) {
        const cap = isETH ? "1 ETH" : "1000 USDC";
        res.status(400).json({ error: `Amount exceeds maximum of ${cap}` });
        return;
      }

      // 2. Check replay
      if (isReplayed(input.paymentTxHash)) {
        res.status(409).json({ error: "Transaction hash already used" });
        return;
      }

      // 3. Verify payment on-chain
      const publicClient = getPublicClient(config.baseRpcUrl, config.baseRpcUrlFallback);

      let receipt;
      try {
        receipt = await publicClient.getTransactionReceipt({
          hash: input.paymentTxHash as Hex,
        });
      } catch {
        res.status(400).json({ error: "Transaction not found on-chain" });
        return;
      }

      if (receipt.status !== "success") {
        res.status(400).json({ error: "Payment transaction failed" });
        return;
      }

      // Get the platform wallet address
      const escrow = getWriteEscrow(config.walletKey, config.baseRpcUrl, config.baseRpcUrlFallback);
      const platformAddress =
        escrow.walletClient.account!.address.toLowerCase();

      if (isETH) {
        // For ETH: check the transaction's value and to address
        const tx = await publicClient.getTransaction({
          hash: input.paymentTxHash as Hex,
        });

        if (tx.to?.toLowerCase() !== platformAddress) {
          res.status(400).json({ error: "Payment not sent to platform wallet" });
          return;
        }

        if (tx.value < amount) {
          res.status(400).json({ error: "Payment amount insufficient" });
          return;
        }
      } else {
        // For USDC: decode Transfer event from receipt logs
        let transferFound = false;

        for (const log of receipt.logs) {
          // Only check USDC contract logs
          if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
            continue;
          }

          try {
            const decoded = decodeEventLog({
              abi: [TRANSFER_EVENT],
              data: log.data,
              topics: log.topics,
            });

            if (
              decoded.eventName === "Transfer" &&
              (decoded.args.to as string).toLowerCase() === platformAddress &&
              (decoded.args.value as bigint) >= amount
            ) {
              transferFound = true;
              break;
            }
          } catch {
            // Not a Transfer event, skip
          }
        }

        if (!transferFound) {
          res.status(400).json({
            error: "No matching USDC transfer to platform wallet found",
          });
          return;
        }
      }

      // 4. Mark tx hash as used BEFORE creating quest
      markUsed(input.paymentTxHash);

      // 5. Create quest on-chain
      const token = isETH ? ZERO_ADDRESS : USDC_ADDRESS;

      // Resolve deadline: tier > days > auto-suggest from description
      let deadlineSeconds: number;
      if (input.deadlineTier) {
        deadlineSeconds = tierToSeconds(input.deadlineTier)!;
      } else if (input.deadlineDays) {
        deadlineSeconds = input.deadlineDays * 86400;
      } else {
        const suggestion = suggestDeadline(input.description);
        deadlineSeconds = suggestion.seconds;
      }
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);

      // For USDC quests, approve first
      if (!isETH) {
        const approveHash = await escrow.approveUSDC(amount);
        await escrow.waitForTransaction(approveHash);
      }

      const txHash = await escrow.createQuest({
        description: input.description,
        deadline,
        token,
        amount,
      });

      const txReceipt = await escrow.waitForTransaction(txHash);

      // Extract questId from QuestCreated event
      let questId: number | null = null;
      for (const log of txReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ESCROW_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "QuestCreated" && decoded.args.questId !== undefined) {
            questId = Number(decoded.args.questId);
            break;
          }
        } catch {
          // Not our event
        }
      }

      logger.info(
        {
          questId,
          txHash,
          amount: input.amount,
          token: input.token,
        },
        "Quest created via x402",
      );

      res.status(201).json({
        questId,
        txHash,
        description: input.description,
        amount: input.amount,
        token: input.token,
        deadlineSeconds: deadlineSeconds,
      });
    } catch (err) {
      logger.error({ err: String(err) }, "x402 create-quest failed");
      res.status(500).json({ error: "Failed to create quest" });
    }
  };
}
