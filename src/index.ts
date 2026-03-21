// Module
export { default, INVOICE_MODULE } from "./modules/invoice-generator"
export { default as InvoiceGeneratorService, type GeneratePdfParams } from "./modules/invoice-generator/service"

// Models / enums
export { InvoiceStatus } from "./modules/invoice-generator/models/invoice"
export { TemplateType } from "./modules/invoice-generator/models/invoice-template"

// Template strategy types (for workflow consumers)
export type {
  InvoiceOrder,
  InvoiceLineItem,
  InvoiceOrderAddress,
  OrderInvoiceInput,
} from "./modules/invoice-generator/templates/order-invoice"
export type {
  ProformaConfigField,
  ProformaLineItem,
  QuoteCustomerInfo,
  QuoteScheduleRules,
  QuoteProformaInput,
} from "./modules/invoice-generator/templates/quote-proforma"
