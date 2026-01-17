import z from "zod";

export const balanceSchema = z.object({
  balance: z.number(),
});

export const topUpBalanceResponse = z.object({
  payment_url: z.string(),
});

export const transactionResponse = z.object({
  id: z.string().uuid(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
  provider: z.string(),
  created_at: z.string().datetime(),
  confirmed_at: z.string().datetime().nullable(),
});

export type Balance = z.infer<typeof balanceSchema>;
export type TopUpUserBalance = z.infer<typeof topUpBalanceResponse>;
export type Transaction = z.infer<typeof transactionResponse>
