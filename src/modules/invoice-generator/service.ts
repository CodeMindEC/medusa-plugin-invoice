import { MedusaService } from "@medusajs/framework/utils"
import type { InferTypeOf } from "@medusajs/framework/types"
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import PdfPrinter from "pdfmake"
import { InvoiceConfig } from "./models/invoice-config"
import { Invoice } from "./models/invoice"
import { InvoiceTemplate } from "./models/invoice-template"
import { PdfGenerationError } from "./errors"
import { TemplateFactory } from "./templates/strategy"

// ── Register all built-in strategies ─────────────────────────────────────────
import { OrderInvoiceStrategy } from "./templates/order-invoice"
import { QuoteProformaStrategy } from "./templates/quote-proforma"
import type { OrderInvoiceInput } from "./templates/order-invoice"
import type { QuoteProformaInput } from "./templates/quote-proforma"

TemplateFactory.register<OrderInvoiceInput>("order_invoice", OrderInvoiceStrategy)
TemplateFactory.register<QuoteProformaInput>("quote_proforma", QuoteProformaStrategy)

// ── PDF printer ───────────────────────────────────────────────────────────────

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
    const docDefinition = await this.resolveDocDefinition(params)
    return this.renderToBuffer(params.template, docDefinition)
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async resolveDocDefinition(
    params: GeneratePdfParams & { invoice_id?: string }
  ): Promise<TDocumentDefinitions> {
    if (!params.invoice_id) {
      return this.buildWithStrategy(params)
    }

    const invoice = await this.retrieveInvoice(params.invoice_id)

    const cached = invoice.pdfContent as TDocumentDefinitions | Record<string, never>
    if (Object.keys(cached).length > 0) {
      return cached as TDocumentDefinitions
    }

    const docDefinition = await this.buildWithStrategy(params)

    await this.updateInvoices({
      id: invoice.id,
      pdfContent: JSON.parse(JSON.stringify(docDefinition)) as Record<string, unknown>,
    })

    return docDefinition
  }

  private async buildWithStrategy(
    params: GeneratePdfParams
  ): Promise<TDocumentDefinitions> {
    const configs = await this.listInvoiceConfigs()
    const config = configs[0] ?? null

    const templates = await this.listInvoiceTemplates({
      slug: params.template,
    })
    const htmlTemplate = templates[0]?.html_content ?? null

    const strategy = TemplateFactory.resolve<typeof params["data"]>(params.template)

    return strategy.buildDocumentDefinition(
      params.data,
      config as InferTypeOf<typeof InvoiceConfig>,
      htmlTemplate
    )
  }

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
