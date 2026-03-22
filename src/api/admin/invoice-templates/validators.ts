import { z } from "@medusajs/framework/zod"

export const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9_]+$/, "Slug must be lowercase alphanumeric with underscores"),
  html_content: z.string().min(1),
  type: z.enum(["order_invoice", "quote_proforma"]),
  is_default: z.boolean().optional().default(false),
  variables_schema: z.record(z.unknown()).nullable().optional(),
  company_id: z.string().nullable().optional(),
})

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  html_content: z.string().min(1).optional(),
  variables_schema: z.record(z.unknown()).nullable().optional(),
  company_id: z.string().nullable().optional(),
})

export type CreateTemplate = z.infer<typeof CreateTemplateSchema>
export type UpdateTemplate = z.infer<typeof UpdateTemplateSchema>
