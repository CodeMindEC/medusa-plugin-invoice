declare module "@codemind.ec/medusa-plugin-invoice" {
  export const INVOICE_MODULE: "invoiceGenerator"

  export enum InvoiceStatus {
    LATEST = "latest",
    STALE = "stale",
  }

  export enum TemplateType {
    ORDER_INVOICE = "order_invoice",
    QUOTE_PROFORMA = "quote_proforma",
  }

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

  export interface ProformaConfigField {
    label: string
    value: string
  }

  export interface ProformaLineItem {
    label: string
    total: number
  }

  export interface QuoteCustomerInfo {
    name: string
    email: string
    phone: string
    cedula?: string
    eventDate: string
    eventTime: string
    province?: string
    city?: string
    address?: string
    addressDetails?: string
  }

  export interface QuoteScheduleRules {
    minAdvanceDays: number
    maxAdvanceDays: number
    minEventTime: string
    maxEventTime: string
  }

  export interface QuoteProformaInput {
    serviceType: string
    scheduleRules: QuoteScheduleRules
    serviceName: string
    configFields: ProformaConfigField[]
    breakdown: ProformaLineItem[]
    includes: string[]
    customerInfo: QuoteCustomerInfo | null
    totals: {
      subtotal: number
      extras: number
      shipping?: number
      discount?: number
      taxes?: number
      total: number
    }
    dateStr: string
    quoteNumber: string
    isHomeDelivery?: boolean
  }

  export type GeneratePdfParams =
    | { template: "order_invoice"; data: OrderInvoiceInput }
    | { template: "quote_proforma"; data: QuoteProformaInput }

  export class InvoiceGeneratorService {
    generatePdf(params: GeneratePdfParams & { invoice_id?: string }): Promise<Buffer>
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
