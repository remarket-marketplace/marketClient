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
    created_at: z.string(),
})

export const DealsListSchema = z.object({
    deals: z.array(DealSchema),
    total: z.number(),
    total_pages: z.number()
})

export const SimpleDealsListSchema = z.array(DealSchema)

export type Deal = z.infer<typeof DealSchema>
export type DealsList = z.infer<typeof DealsListSchema>