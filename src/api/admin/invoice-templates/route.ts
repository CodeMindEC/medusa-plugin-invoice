import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { CreateTemplate } from "./validators"
import { INVOICE_MODULE } from "../../../modules/invoice-generator"
import InvoiceGeneratorService from "../../../modules/invoice-generator/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

  const { data: templates } = await query.graph({
    entity: "invoice_template",
    fields: ["id", "name", "slug", "type", "is_default", "created_at", "updated_at"],
  })

  res.json({ invoice_templates: templates })
}

export async function POST(
  req: MedusaRequest<CreateTemplate>,
  res: MedusaResponse
) {
  const body = req.validatedBody ?? req.body
  const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

  const template = await service.createInvoiceTemplates(body as Record<string, unknown>)

  res.status(201).json({ invoice_template: template })
}
