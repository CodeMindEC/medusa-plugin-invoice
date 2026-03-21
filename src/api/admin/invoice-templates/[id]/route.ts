import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { UpdateTemplate } from "../validators"
import { INVOICE_MODULE } from "../../../../modules/invoice-generator"
import InvoiceGeneratorService from "../../../../modules/invoice-generator/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

  const template = await service.retrieveInvoiceTemplate(id)

  res.json({ invoice_template: template })
}

export async function POST(
  req: MedusaRequest<UpdateTemplate>,
  res: MedusaResponse
) {
  const { id } = req.params
  const body = req.validatedBody ?? req.body
  const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

  const template = await service.updateInvoiceTemplates({ id, ...body })

  res.json({ invoice_template: template })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

  const existing = await service.retrieveInvoiceTemplate(id)

  if (existing.is_default) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "No se puede eliminar una plantilla por defecto"
    )
  }

  await service.deleteInvoiceTemplates(id)

  res.status(200).json({ id, object: "invoice_template", deleted: true })
}
