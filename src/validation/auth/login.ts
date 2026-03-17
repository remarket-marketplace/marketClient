import { z } from "zod"

import { UserReadSchema } from "@/validation/user/userRead"

export const LoginResponseSchema = z.object({
  two_factor_required: z.boolean().optional().transform((value) => value ?? false),
  two_factor_token: z.string().nullable().optional().transform((value) => value ?? null),
  user: UserReadSchema.nullable().optional().transform((value) => value ?? null),
})

export type LoginResponse = z.infer<typeof LoginResponseSchema>
