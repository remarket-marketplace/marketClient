import z from "zod";

export const ReviewSchema = z
  .object({
    id: z.uuid(),
    deal_id: z.uuid(),
    rating: z.int(),
    body: z.string(),
    created_at: z.string(),
  })
  .strip();

export const ReviewsListSchema = z.array(ReviewSchema)


export type ReviewSchema = z.infer<typeof ReviewSchema>
export type ReviewsListSchema = z.infer<typeof ReviewsListSchema>
