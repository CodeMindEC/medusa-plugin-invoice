import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVOICE_MODULE } from "../../../modules/invoice-generator"
import InvoiceGeneratorService from "../../../modules/invoice-generator/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

  const { data: configs } = await query.graph({
    entity: "invoice_config",
    fields: ["*"],
  })

  res.json({
    invoice_configs: configs
  })
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const body = req.validatedBody ?? req.body
  const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

  const config = await service.createInvoiceConfigs(body as Record<string, unknown>)

  res.status(201).json({
    invoice_config: config
  })
}
