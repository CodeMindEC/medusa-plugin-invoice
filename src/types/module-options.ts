import type { StrategyRegistrationMeta } from "../modules/invoice-generator/templates/strategy"
import type { DocumentStrategy } from "../modules/invoice-generator/templates/strategy"

// ── Strategy registration entry ──────────────────────────────────────────────

export interface StrategyRegistration {
  /** Unique slug identifier (e.g. "order_invoice", "delivery_note") */
  id: string
  /**
   * Strategy class constructor.
   * Must implement `DocumentStrategy<TInput>`. Extend `BaseDocumentStrategy`
   * for access to shared helpers (formatAmount, imageUrlToBase64, etc.).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strategy: new () => DocumentStrategy<any>
  /** UI metadata: label, variable categories, sample data builder, default HTML */
  meta: StrategyRegistrationMeta
}

// ── Module options ───────────────────────────────────────────────────────────

export interface InvoiceModuleOptions {
  /**
   * Document strategies to register.
   * Each entry maps a template ID to a strategy class + UI metadata.
   *
   * @example
   * ```ts
   * strategies: [
   *   { id: "order_invoice", strategy: OrderInvoiceStrategy, meta: ORDER_INVOICE_META },
   * ]
   * ```
   */
  strategies?: StrategyRegistration[]

  /** PDF rendering defaults */
  pdf?: {
    /** Page size (default: "A4") */
    pageSize?: string
    /** Page margins [left, top, right, bottom] (default: [40, 60, 40, 60]) */
    margins?: [number, number, number, number]
  }

  /** Puppeteer/Chromium config for HTML→PDF rendering */
  puppeteer?: {
    /** Path to Chromium executable (default: process.env.PUPPETEER_CHROMIUM_PATH || "/usr/bin/chromium") */
    executablePath?: string
    /** Additional launch args (default: ["--no-sandbox", "--disable-setuid-sandbox", ...]) */
    args?: string[]
  }

  /** Default locale for date/number formatting (default: "es-ES") */
  locale?: string
  /** Default currency code (default: "USD") */
  currency?: string
}
