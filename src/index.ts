// Module
export { default, INVOICE_MODULE } from "./modules/invoice-generator"
export { default as InvoiceGeneratorService, type GeneratePdfParams } from "./modules/invoice-generator/service"

// Models
export { InvoiceStatus } from "./modules/invoice-generator/models/invoice"

// Core extensibility API — consumers import these to register custom strategies
export { TemplateFactory, BaseDocumentStrategy } from "./modules/invoice-generator/templates/strategy"
export type {
    DocumentStrategy,
    BuildResult,
    StrategyRegistrationMeta,
    VariableCategory,
} from "./modules/invoice-generator/templates/strategy"

// Module options type — used in medusa-config.ts
export type { InvoiceModuleOptions, StrategyRegistration } from "./types/module-options"

// Built-in strategy: Order Invoice (optional — consumer imports and registers explicitly)
export { OrderInvoiceStrategy, ORDER_INVOICE_META } from "./modules/invoice-generator/templates/order-invoice"
export type {
    OrderInvoiceInput,
    InvoiceOrder,
    InvoiceLineItem,
    InvoiceOrderAddress,
} from "./modules/invoice-generator/templates/order-invoice"
