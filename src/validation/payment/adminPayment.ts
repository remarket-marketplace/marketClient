import z from 'zod'

export const adminPaymentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  username: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELED', 'CHARGEBACKED']),
  provider: z.string(),
  provider_tx_id: z.string().nullable(),
  description: z.string().nullable(),
  created_at: z.string().datetime(),
  confirmed_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime(),
})

export type AdminPayment = z.infer<typeof adminPaymentSchema>

export const adminPaymentsListSchema = z.object({
  payments: z.array(adminPaymentSchema),
  total: z.number(),
  total_pages: z.number(),
})

export type AdminPaymentsList = z.infer<typeof adminPaymentsListSchema>
