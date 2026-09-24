import z from 'zod'

export const adminWithdrawalOrderSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  username: z.string(),
  amount: z.number(),
  commission_percent: z.number().nullable().optional(),
  commission_amount: z.number().nullable().optional(),
  payout_amount: z.number().nullable().optional(),
  current_balance: z.number(),
  status: z.enum(['pending', 'confirmed', 'canceled']),
  card_number: z.string(),
  masked_card_number: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type AdminWithdrawalOrder = z.infer<typeof adminWithdrawalOrderSchema>

export const adminWithdrawalOrdersListSchema = z.object({
  orders: z.array(adminWithdrawalOrderSchema),
  total: z.number(),
  total_pages: z.number(),
})

export type AdminWithdrawalOrdersList = z.infer<typeof adminWithdrawalOrdersListSchema>
