import { MedusaService } from "@medusajs/framework/utils"
import type { InferTypeOf } from "@medusajs/framework/types"
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import PdfPrinter from "pdfmake"
import { InvoiceConfig } from "./models/invoice-config"
import { Invoice } from "./models/invoice"
import { InvoiceTemplate } from "./models/invoice-template"
import { PdfGenerationError } from "./errors"
import { TemplateFactory, type BuildResult } from "./templates/strategy"

// ── Register all built-in strategies ─────────────────────────────────────────
import { OrderInvoiceStrategy } from "./templates/order-invoice"
import { QuoteProformaStrategy } from "./templates/quote-proforma"
import type { OrderInvoiceInput } from "./templates/order-invoice"
import type { QuoteProformaInput } from "./templates/quote-proforma"

TemplateFactory.register<OrderInvoiceInput>("order_invoice", OrderInvoiceStrategy)
TemplateFactory.register<QuoteProformaInput>("quote_proforma", QuoteProformaStrategy)

// ── PDF printer (pdfmake fallback) ────────────────────────────────────────────

const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
} as const

const printer = new PdfPrinter(fonts)

// ── Discriminated union for template params ───────────────────────────────────

export type GeneratePdfParams =
  | { template: "order_invoice"; data: OrderInvoiceInput }
  | { template: "quote_proforma"; data: QuoteProformaInput }

// ── Service ───────────────────────────────────────────────────────────────────

class InvoiceGeneratorService extends MedusaService({
  InvoiceConfig,
  Invoice,
  InvoiceTemplate,
}) {
  async generatePdf(
    params: GeneratePdfParams & { invoice_id?: string }
  ): Promise<Buffer> {
    const result = await this.resolveResult(params)

    if (result.type === "html") {
      return this.renderHtmlToPdf(result.html)
    }

    return this.renderToBuffer(params.template, result.definition)
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async resolveResult(
    params: GeneratePdfParams & { invoice_id?: string }
  ): Promise<BuildResult> {
    if (!params.invoice_id) {
      return this.buildWithStrategy(params)
    }

    const invoice = await this.retrieveInvoice(params.invoice_id)

    const cached = invoice.pdfContent as Record<string, unknown> | Record<string, never>
    if (cached && Object.keys(cached).length > 0) {
      // New format with type discriminator
      if (cached.type === "html") {
        return { type: "html", html: cached.html as string }
      }
      if (cached.type === "pdfmake") {
        return { type: "pdfmake", definition: cached.definition as TDocumentDefinitions }
      }
      // Legacy format: raw pdfmake definition without wrapper
      return { type: "pdfmake", definition: cached as unknown as TDocumentDefinitions }
    }

    const result = await this.buildWithStrategy(params)

    await this.updateInvoices({
      id: invoice.id,
      pdfContent: JSON.parse(JSON.stringify(result)) as Record<string, unknown>,
    })

    return result
  }

  private async buildWithStrategy(
    params: GeneratePdfParams
  ): Promise<BuildResult> {
    const configs = await this.listInvoiceConfigs()

    // Resolve template (to check company_id)
    const templates = await this.listInvoiceTemplates({
      slug: params.template,
    })
    const htmlTemplate = templates[0]?.html_content ?? null
    const templateCompanyId = (templates[0] as Record<string, unknown>)?.company_id as string | null

    // Resolve company: template.company_id → is_default → first available
    let config = null as InferTypeOf<typeof InvoiceConfig> | null
    if (templateCompanyId) {
      config = configs.find((c) => c.id === templateCompanyId) ?? null
    }
    if (!config) {
      config = configs.find((c) => (c as Record<string, unknown>).is_default === true) ?? null
    }
    if (!config) {
      config = configs[0] ?? null
    }

    const strategy = TemplateFactory.resolve<typeof params["data"]>(params.template)

    return strategy.buildDocumentDefinition(
      params.data,
      config,
      htmlTemplate
    )
  }

  /** Renders raw HTML to PDF via puppeteer-core + system chromium */
  private async renderHtmlToPdf(html: string): Promise<Buffer> {
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
      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close()
    }
  }

  /** Renders a pdfmake TDocumentDefinitions to a PDF buffer (fallback path) */
  private renderToBuffer(
    templateId: string,
    docDefinition: TDocumentDefinitions
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []

      let pdfDoc: ReturnType<typeof printer.createPdfKitDocument>

      try {
        pdfDoc = printer.createPdfKitDocument(docDefinition)
      } catch (err) {
        reject(new PdfGenerationError(templateId, err))
        return
      }

      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk))
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)))
      pdfDoc.on("error", (err: Error) =>
        reject(new PdfGenerationError(templateId, err))
      )

      pdfDoc.end()
    })
  }
}

export default InvoiceGeneratorService
