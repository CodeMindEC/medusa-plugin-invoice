import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVOICE_MODULE } from "../../../../../modules/invoice-generator"
import InvoiceGeneratorService from "../../../../../modules/invoice-generator/service"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

  const template = await service.retrieveInvoiceTemplate(id)

  // Generate a preview PDF using the template's HTML with sample data
  const sampleParams = template.type === "order_invoice"
    ? buildOrderInvoiceSample()
    : buildQuoteProformaSample()

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

function buildOrderInvoiceSample(): Record<string, unknown> {
  return {
    company_name: "Mi Empresa",
    company_ruc: "1234567890001",
    company_address: "Av. Principal 123, Quito, Ecuador",
    company_phone: "+593 99 123 4567",
    company_email: "info@miempresa.com",
    company_logo_base64: "",
    invoice_id: "INV-000001",
    invoice_date: new Date().toLocaleDateString("es-ES"),
    order_display_id: "000042",
    order_date: new Date().toLocaleDateString("es-ES"),
    billing_address: "Juan Pérez\nCalle Ejemplo 456\nQuito, Pichincha\nEC",
    shipping_address: "Juan Pérez\nCalle Ejemplo 456\nQuito, Pichincha\nEC",
    cedula: "1712345678",
    items: [
      { title: "Producto de ejemplo", variant_title: "Grande", quantity: "2", unit_price: "$25.00", total: "$50.00" },
      { title: "Otro producto", variant_title: "", quantity: "1", unit_price: "$15.00", total: "$15.00" },
    ],
    subtotal: "$65.00",
    tax_total: "$7.80",
    shipping_total: "$5.00",
    discount_total: "",
    total: "$77.80",
    is_home_delivery: false,
    notes: "Gracias por su compra. Tiempo de entrega: 3-5 días hábiles.",
  }
}

function buildQuoteProformaSample(): Record<string, unknown> {
  return {
    company_name: "Mi Empresa",
    company_website: "www.miempresa.com",
    quote_number: "QP-2025-0001",
    date_str: new Date().toLocaleDateString("es-ES"),
    service_name: "SERVICIO DE EJEMPLO",
    config_fields: [
      { label: "Número de personas", value: "50" },
      { label: "Tipo de menú", value: "Premium" },
    ],
    breakdown: [
      { label: "Servicio base (50 personas)", total_formatted: "$500.00" },
      { label: "Menú premium", total_formatted: "$250.00" },
      { label: "Decoración", total_formatted: "$100.00" },
    ],
    totals: {
      subtotal_formatted: "$750.00",
      extras_formatted: "$100.00",
      discount: 0,
      discount_formatted: "",
      shipping: 25,
      shipping_formatted: "$25.00",
      taxes_provided: true,
      taxes_formatted: "$105.00",
      total_formatted: "980.00",
    },
    is_home_delivery: false,
    includes: ["Vajilla completa", "Mantelería", "Personal de servicio", "Montaje y desmontaje"],
    includes_left: ["Vajilla completa", "Personal de servicio"],
    includes_right: ["Mantelería", "Montaje y desmontaje"],
    contact_rows: [
      { label: "Nombre", value: "María García" },
      { label: "Email", value: "maria@ejemplo.com" },
      { label: "Teléfono", value: "+593 99 987 6543" },
      { label: "Fecha del evento", value: "2025-08-15" },
    ],
  }
}
