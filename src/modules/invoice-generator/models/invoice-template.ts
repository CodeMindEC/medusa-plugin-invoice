import { model } from "@medusajs/framework/utils"

export const InvoiceTemplate = model.define("invoice_template", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text(),
  html_content: model.text(),
  type: model.text(),
  is_default: model.boolean().default(false),
  variables_schema: model.json().nullable(),
  company_id: model.text().nullable(),
})
