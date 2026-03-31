import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INVOICE_MODULE } from "../../../../../modules/invoice-generator"
import InvoiceGeneratorService from "../../../../../modules/invoice-generator/service"
import { TemplateFactory } from "../../../../../modules/invoice-generator/templates/strategy"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

  const template = await service.retrieveInvoiceTemplate(id)

  if (!template.is_default) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Solo se pueden restaurar plantillas por defecto"
    )
  }

  const meta = TemplateFactory.getMeta(template.type)
  if (!meta?.defaultHtml) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No se encontró HTML por defecto para el tipo: ${template.type}`
    )
  }

  const updated = await service.updateInvoiceTemplates({ id, html_content: meta.defaultHtml })

  res.json({ invoice_template: updated })
}

