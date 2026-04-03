import { z } from 'zod'

import { PublicProfileDataSchema } from './userRead'

const SubscriptionSellerSchema = PublicProfileDataSchema

export const UserSubscriptionsListSchema = z.object({
  subscriptions: z.array(SubscriptionSellerSchema),
  total: z.number().int().nonnegative(),
})

export type SubscriptionSeller = z.infer<typeof SubscriptionSellerSchema>
export type UserSubscriptionsList = z.infer<typeof UserSubscriptionsListSchema>
