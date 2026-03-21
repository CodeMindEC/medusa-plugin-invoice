import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INVOICE_MODULE } from "../../../../../modules/invoice-generator"
import InvoiceGeneratorService from "../../../../../modules/invoice-generator/service"
import { DEFAULT_TEMPLATES } from "../../../../../modules/invoice-generator/templates/defaults"

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

  const defaultTpl = DEFAULT_TEMPLATES.find(t => t.slug === template.slug)
  if (!defaultTpl) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No se encontró plantilla por defecto para slug: ${template.slug}`
    )
  }

  const updated = await service.updateInvoiceTemplates({ id, html_content: defaultTpl.html })

  res.json({ invoice_template: updated })
}
