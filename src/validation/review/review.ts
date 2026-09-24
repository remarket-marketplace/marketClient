import z from "zod";

export const ReviewAuthorSchema = z
  .object({
    username: z.string(),
    avatar_url: z.string(),
    nickname_style_id: z
      .string()
      .nullish()
      .transform((value) => value ?? "default"),
  })
  .strip();

export const ReviewSchema = z
  .object({
    id: z.uuid(),
    deal_id: z.uuid(),
    rating: z.int(),
    body: z.string(),
    created_at: z.string(),
    reviewer: ReviewAuthorSchema.nullish(),
  })
  .strip();

export const ReviewsListSchema = z.array(ReviewSchema)


export type ReviewSchema = z.infer<typeof ReviewSchema>
export type ReviewsListSchema = z.infer<typeof ReviewsListSchema>
export type ReviewAuthorSchema = z.infer<typeof ReviewAuthorSchema>
