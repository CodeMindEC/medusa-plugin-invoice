import { model } from "@medusajs/framework/utils"

export const InvoiceConfig = model.define("invoice_config", {
  id: model.id().primaryKey(),
  company_name: model.text(),
  company_ruc: model.text().nullable(),
  company_address: model.text(),
  company_phone: model.text(),
  company_email: model.text(),
  company_logo: model.text().nullable(),
  notes: model.text().nullable(),
  admin_notification_email: model.text().nullable(),
})
