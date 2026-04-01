import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
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

  // Get sample data from the registered strategy's metadata
  const meta = TemplateFactory.getMeta(template.type)
  const sampleParams = meta?.buildSampleData?.() ?? {}

  const Handlebars = (await import("handlebars")).default
  const compiled = Handlebars.compile(template.html_content)
  const html = compiled(sampleParams)

  const pdfBuffer = await service.renderHtmlToPdf(html)

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `inline; filename="preview-${template.slug}.pdf"`)
  res.send(Buffer.from(pdfBuffer))
}
