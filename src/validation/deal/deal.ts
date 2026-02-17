import z from "zod";
import { UserReadSchema } from "../user/userRead";
import { ProductSchema } from "../product/product";

export const UUIDSchema = z.string()

export const DealSchema = z.object({
    id: UUIDSchema,
    price: z.number(),
    status: z.string(),
    seller: UserReadSchema,
    buyer: UserReadSchema,
    product: ProductSchema,
    chat_room_id: UUIDSchema.nullable().optional(),
    refusal_reason: z.object({
        deal_id: UUIDSchema,
        refusal_reason_title: z.string(),
        text: z.string().nullable(),
    }).nullable().optional(),
    created_at: z.string(),
})

export const DealsListSchema = z.object({
    deals: z.array(DealSchema),
    total: z.number(),
    total_pages: z.number()
})

export const RefusalReasonSchema = z.object({
    id: UUIDSchema,
    title: z.string(),
})

export const SimpleDealsListSchema = z.array(DealSchema)
export const RefusalReasonsListSchema = z.array(RefusalReasonSchema)


export type Deal = z.infer<typeof DealSchema>
export type DealsList = z.infer<typeof DealsListSchema>
export type RefusalReason = z.infer<typeof RefusalReasonSchema>
export type RefusalReasonsList = z.infer<typeof RefusalReasonsListSchema>
