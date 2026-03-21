import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVOICE_MODULE } from "../../../modules/invoice-generator"
import InvoiceGeneratorService from "../../../modules/invoice-generator/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

  const { data: [invoiceConfig] } = await query.graph({
    entity: "invoice_config",
    fields: ["*"],
  })

  res.json({
    invoice_config: invoiceConfig
  })
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const body = req.validatedBody ?? req.body
  const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

  const configs = await service.listInvoiceConfigs()
  const existing = configs[0]

  const updated = await service.updateInvoiceConfigs({ id: existing.id, ...(body as Record<string, unknown>) })

  res.json({
    invoice_config: updated
  })
}
