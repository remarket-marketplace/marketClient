import { z } from "zod"

export const TwoFactorSettingsSchema = z.object({
  enabled: z.boolean(),
})

export type TwoFactorSettings = z.infer<typeof TwoFactorSettingsSchema>

export const UpdateTwoFactorSettingsSchema = z.object({
  enabled: z.boolean(),
})

export type UpdateTwoFactorSettings = z.infer<typeof UpdateTwoFactorSettingsSchema>
