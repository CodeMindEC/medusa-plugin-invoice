import { defineMiddlewares } from "@medusajs/medusa"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { CreateTemplateSchema, UpdateTemplateSchema } from "./admin/invoice-templates/validators"

const PostInvoiceConfigSchema = z.object({
    company_name: z.string().optional(),
    company_ruc: z.string().optional(),
    company_address: z.string().optional(),
    company_phone: z.string().optional(),
    company_email: z.string().optional(),
    company_logo: z.string().optional(),
    notes: z.string().optional(),
    admin_notification_email: z.string().email().optional().or(z.literal("")),
})

export default defineMiddlewares({
    routes: [
        {
            matcher: "/admin/invoice-config",
            methods: ["POST"],
            middlewares: [validateAndTransformBody(PostInvoiceConfigSchema)],
        },
        {
            matcher: "/admin/invoice-templates",
            methods: ["POST"],
            middlewares: [validateAndTransformBody(CreateTemplateSchema)],
        },
        {
            matcher: "/admin/invoice-templates/:id",
            methods: ["POST"],
            middlewares: [validateAndTransformBody(UpdateTemplateSchema)],
        },
    ],
})
