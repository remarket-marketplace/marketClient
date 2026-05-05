import z from "zod";

export const walletTopUpProviderSchema = z.enum(["platega", "lava"]);

export const balanceSchema = z.object({
  balance: z.number(),
  top_up_min_amount: z.number().int().positive(),
  top_up_max_amount: z.number().int().positive(),
  withdrawal_commission_percent: z.number().min(0).max(100).default(0),
  available_top_up_providers: z.array(walletTopUpProviderSchema).default(["lava"]),
});

export const topUpBalanceRequestSchema = z.object({
  amount: z.number().int().positive(),
  provider: walletTopUpProviderSchema.default("lava"),
});

export const topUpBalanceResponse = z.object({
  payment_url: z.string(),
});

export const createWithdrawalOrderRequestSchema = z.object({
  amount: z.number().positive(),
  card_number: z.string().regex(/^T[1-9A-HJ-NP-Za-km-z]{33}$/, 'Invalid TRC-20 wallet address'),
});

export const createWithdrawalOrderResponseSchema = z.object({
  id: z.string().uuid(),
  amount: z.number(),
  commission_percent: z.number().nullable().optional(),
  commission_amount: z.number().nullable().optional(),
  payout_amount: z.number().nullable().optional(),
  status: z.enum(['pending', 'confirmed', 'canceled']),
  masked_card_number: z.string(),
  created_at: z.string(),
  current_balance: z.number(),
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
export type CreateWithdrawalOrderRequest = z.infer<typeof createWithdrawalOrderRequestSchema>;
export type CreateWithdrawalOrderResponse = z.infer<typeof createWithdrawalOrderResponseSchema>;
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
  note: z.string().nullable().optional(),
  product_id: z.string().uuid().nullable(),
  gross_amount: z.number().nullable().optional(),
  commission_percent: z.number().nullable().optional(),
  commission_amount: z.number().nullable().optional(),
  payout_amount: z.number().nullable().optional(),
  payment_provider: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  provider_tx_id: z.string().nullable().optional(),
  confirmed_at: z.string().nullable().optional(),
  reference_id: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
})
export type WalletHistoryItem = z.infer<typeof walletHistoryItem>

export const walletHistoryResponse = z.object({
  items: z.array(walletHistoryItem),
  total: z.number(),
  total_pages: z.number()
})
export type WalletHistoryResponse = z.infer<typeof walletHistoryResponse>
