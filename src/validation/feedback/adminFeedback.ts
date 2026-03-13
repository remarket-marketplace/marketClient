import z from "zod";
import { PublicProfileDataSchema } from "../user/userRead";

export const FeedbackImageSchema = z.object({
  id: z.string().uuid(),
  image_url: z.string(),
});

export const AdminFeedbackListItemSchema = z.object({
  id: z.string().uuid(),
  text_preview: z.string(),
  created_at: z.string(),
  user: PublicProfileDataSchema,
  images_count: z.number().int().nonnegative(),
  support_chat_id: z.string().uuid().nullable(),
});

export const AdminFeedbackListSchema = z.object({
  feedbacks: z.array(AdminFeedbackListItemSchema),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
});

export const AdminFeedbackSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  created_at: z.string(),
  user: PublicProfileDataSchema,
  images: z.array(FeedbackImageSchema),
  support_chat_id: z.string().uuid().nullable(),
});

export type FeedbackImage = z.infer<typeof FeedbackImageSchema>;
export type AdminFeedbackListItem = z.infer<typeof AdminFeedbackListItemSchema>;
export type AdminFeedbackList = z.infer<typeof AdminFeedbackListSchema>;
export type AdminFeedback = z.infer<typeof AdminFeedbackSchema>;
