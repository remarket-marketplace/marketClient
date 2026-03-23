import z from "zod";

export const walletTopUpProviderSchema = z.enum(["platega", "lava"]);

export const balanceSchema = z.object({
  balance: z.number(),
  top_up_min_amount: z.number().int().positive(),
  top_up_max_amount: z.number().int().positive(),
  available_top_up_providers: z.array(walletTopUpProviderSchema).default(["platega"]),
});

export const topUpBalanceRequestSchema = z.object({
  amount: z.number().int().positive(),
  provider: walletTopUpProviderSchema.default("platega"),
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
export type WalletTopUpProvider = z.infer<typeof walletTopUpProviderSchema>;
export type TopUpBalanceRequest = z.infer<typeof topUpBalanceRequestSchema>;
export type TopUpUserBalance = z.infer<typeof topUpBalanceResponse>;
export type Transaction = z.infer<typeof transactionResponse>

export const transactionsResponse = z.object({
  transactions: z.array(transactionResponse),
  total: z.number(),
  total_pages: z.number()
})
export type TransactionsResponse = z.infer<typeof transactionsResponse>

export const walletHistoryItem = z.object({
  id: z.string().uuid(),
  type: z.string(),
  amount: z.number(),
  status: z.string(),
  created_at: z.string(),
  title: z.string().nullable(),
  product_id: z.string().uuid().nullable(),
})
export type WalletHistoryItem = z.infer<typeof walletHistoryItem>

export const walletHistoryResponse = z.object({
  items: z.array(walletHistoryItem),
  total: z.number(),
  total_pages: z.number()
})
export type WalletHistoryResponse = z.infer<typeof walletHistoryResponse>
