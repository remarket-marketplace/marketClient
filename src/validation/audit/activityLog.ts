import z from "zod";

export const AuditLogLinksSchema = z.object({
  product: z.string().nullable().optional(),
  deal: z.string().nullable().optional(),
  chat: z.string().nullable().optional(),
  admin_deal: z.string().nullable().optional(),
  admin_chat: z.string().nullable().optional(),
  user_profile: z.string().nullable().optional(),
  admin_user: z.string().nullable().optional(),
});

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  action_type: z.string(),
  user_id: z.string().uuid().nullable().optional(),
  username: z.string().nullable().optional(),
  current_username: z.string().nullable().optional(),
  user_role: z.string().nullable().optional(),
  ip_address: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
  country_name: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  http_method: z.string().nullable().optional(),
  endpoint: z.string().nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  chat_id: z.string().uuid().nullable().optional(),
  details: z.record(z.string(), z.any()).nullable().optional(),
  links: AuditLogLinksSchema,
});

export const AuditLogsListSchema = z.object({
  logs: z.array(AuditLogSchema),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
});

export const AuditActionTypesSchema = z.object({
  action_types: z.array(z.string()),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AuditLogsList = z.infer<typeof AuditLogsListSchema>;
