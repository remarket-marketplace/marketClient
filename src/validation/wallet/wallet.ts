import z from "zod";

export const balanceSchema = z.object({
    balance: z.number()
})

export type Balance = z.infer<typeof balanceSchema>