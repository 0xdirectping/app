import { z } from "zod";

// Strip control characters from descriptions
function sanitize(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

export const createQuestSchema = z.object({
  description: z
    .string()
    .min(1)
    .max(500)
    .transform(sanitize)
    .refine((s) => s.length > 0, { message: "Description cannot be empty" }),
  amount: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Amount must be a decimal string"),
  token: z.enum(["ETH", "USDC"]),
  deadlineDays: z.number().int().min(1).max(365).optional(),
  deadlineTier: z.enum(["quick", "standard", "extended"]).optional(),
  paymentTxHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
});

export type CreateQuestInput = z.infer<typeof createQuestSchema>;

export const completeQuestSchema = z.object({
  questId: z.number().int().min(0),
});

export type CompleteQuestInput = z.infer<typeof completeQuestSchema>;

export const cancelQuestSchema = z.object({
  questId: z.number().int().min(0),
});

export type CancelQuestInput = z.infer<typeof cancelQuestSchema>;
