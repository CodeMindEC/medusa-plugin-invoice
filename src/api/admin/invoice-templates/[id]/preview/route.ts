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

  // Render HTML → PDF via puppeteer-core + system chromium
  const puppeteer = await import("puppeteer-core")
  const executablePath =
    process.env.PUPPETEER_CHROMIUM_PATH || "/usr/bin/chromium"

  const browser = await puppeteer.default.launch({
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    })

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `inline; filename="preview-${template.slug}.pdf"`)
    res.send(Buffer.from(pdfBuffer))
  } finally {
    await browser.close()
  }
}
