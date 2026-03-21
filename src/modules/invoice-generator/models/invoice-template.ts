import { model } from "@medusajs/framework/utils"

export enum TemplateType {
  ORDER_INVOICE = "order_invoice",
  QUOTE_PROFORMA = "quote_proforma",
}

export const InvoiceTemplate = model.define("invoice_template", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text(),
  html_content: model.text(),
  type: model.enum(TemplateType),
  is_default: model.boolean().default(false),
  variables_schema: model.json().nullable(),
})
