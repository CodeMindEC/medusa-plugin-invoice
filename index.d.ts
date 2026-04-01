declare module "@codemind.ec/medusa-plugin-invoice" {
  export const INVOICE_MODULE: "invoiceGenerator"

  // ── Models ──────────────────────────────────────────────────────────────────

  export enum InvoiceStatus {
    LATEST = "latest",
    STALE = "stale",
  }

  // ── Core extensibility API ──────────────────────────────────────────────────

  export type BuildResult =
    | { type: "pdfmake"; definition: any }
    | { type: "html"; html: string }

  export interface VariableCategory {
    label: string
    icon: string
    variables: { name: string; isBlock?: boolean }[]
  }

  export interface StrategyRegistrationMeta {
    label: string
    variableCategories?: VariableCategory[]
    buildSampleData?: () => Record<string, unknown>
    defaultHtml?: string
  }

  export interface DocumentStrategy<TInput> {
    buildDocumentDefinition(
      input: TInput,
      config: any,
      htmlTemplate?: string | null
    ): Promise<BuildResult>
  }

  export abstract class BaseDocumentStrategy<TInput> implements DocumentStrategy<TInput> {
    protected getLocaleForCurrency(currencyCode: string): string
    protected formatAmount(amount: number, currency: string): string
    protected imageUrlToBase64(url: string): Promise<string>
    protected renderHtmlTemplate(htmlTemplate: string, data: Record<string, unknown>): Promise<BuildResult>
    protected buildCompanyContext(config: any): Promise<Record<string, string>>
    abstract buildDocumentDefinition(input: TInput, config: any, htmlTemplate?: string | null): Promise<BuildResult>
  }

  export class TemplateFactory {
    static register<TInput>(
      templateId: string,
      strategy: new () => DocumentStrategy<TInput>,
      meta?: StrategyRegistrationMeta
    ): void
    static resolve<TInput>(templateId: string): DocumentStrategy<TInput>
    static getMeta(templateId: string): StrategyRegistrationMeta | undefined
    static listRegistered(): string[]
    static listRegisteredWithMeta(): Array<{ id: string; meta?: StrategyRegistrationMeta }>
  }

  // ── Module options ──────────────────────────────────────────────────────────

  export interface StrategyRegistration {
    id: string
    strategy: new () => DocumentStrategy<any>
    meta: StrategyRegistrationMeta
  }

  export interface InvoiceModuleOptions {
    strategies?: StrategyRegistration[]
    pdf?: {
      pageSize?: string
      margins?: [number, number, number, number]
    }
    puppeteer?: {
      executablePath?: string
      args?: string[]
    }
    locale?: string
    currency?: string
  }

  // ── Built-in strategy: Order Invoice ────────────────────────────────────────

  export interface InvoiceOrderAddress {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    country_code?: string | null
    phone?: string | null
    metadata?: Record<string, unknown> | null
  }

  export interface InvoiceLineItem {
    id: string
    title: string
    quantity: number
    unit_price: number
    subtotal?: number | null
    variant_title?: string | null
    variant?: { title?: string | null; product?: { title?: string | null } | null } | null
    metadata?: Record<string, unknown> | null
  }

  export interface InvoiceOrder {
    id: string
    display_id?: number | null
    email?: string | null
    created_at: string | Date
    currency_code?: string | null
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    discount_total?: number | null
    shipping_address?: InvoiceOrderAddress | null
    billing_address?: InvoiceOrderAddress | null
    shipping_methods?: Array<{ name?: string | null; amount?: number | null; shipping_option_id?: string | null }> | null
    items?: InvoiceLineItem[] | null
    metadata?: Record<string, unknown> | null
  }

  export interface OrderInvoiceInput {
    order: InvoiceOrder
    items: InvoiceLineItem[]
    invoiceDisplayId: number
    created_at: string
  }

  export class OrderInvoiceStrategy extends BaseDocumentStrategy<OrderInvoiceInput> {
    buildDocumentDefinition(input: OrderInvoiceInput, config: any, htmlTemplate?: string | null): Promise<BuildResult>
  }

  export const ORDER_INVOICE_META: StrategyRegistrationMeta

  // ── Service ─────────────────────────────────────────────────────────────────

  export type GeneratePdfParams = {
    template: string
    data: Record<string, unknown>
  }

  export class InvoiceGeneratorService {
    generatePdf(params: GeneratePdfParams & { invoice_id?: string }): Promise<Buffer>
    renderHtmlToPdf(html: string): Promise<Buffer>
    listStrategies(): Array<{ id: string; meta?: StrategyRegistrationMeta }>
    listInvoiceConfigs(filters?: Record<string, unknown>): Promise<any[]>
    updateInvoiceConfigs(data: Record<string, unknown>): Promise<any>
    retrieveInvoiceConfig(id: string): Promise<any>
    listInvoices(filters?: Record<string, unknown>): Promise<any[]>
    updateInvoices(data: any): Promise<any>
    createInvoices(data: Record<string, unknown>): Promise<any>
    deleteInvoices(id: string): Promise<void>
    retrieveInvoice(id: string): Promise<any>
    listInvoiceTemplates(filters?: Record<string, unknown>): Promise<any[]>
    createInvoiceTemplates(data: Record<string, unknown>): Promise<any>
    updateInvoiceTemplates(data: Record<string, unknown>): Promise<any>
    deleteInvoiceTemplates(id: string): Promise<void>
    retrieveInvoiceTemplate(id: string): Promise<any>
  }
}

declare module "@codemind.ec/medusa-plugin-invoice/modules/invoice-generator" {
  export const INVOICE_MODULE: "invoiceGenerator"
  export default object
}
