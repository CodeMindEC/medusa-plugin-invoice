import {
  LoaderOptions,
  IMedusaInternalService,
} from "@medusajs/framework/types"
import { InvoiceConfig } from "../models/invoice-config"
import { InvoiceTemplate, TemplateType } from "../models/invoice-template"
import { DEFAULT_TEMPLATES } from "../templates/defaults"

export default async function createDefaultConfigLoader({
  container,
}: LoaderOptions) {
  const service: IMedusaInternalService<
    typeof InvoiceConfig
  > = container.resolve("invoiceConfigService")

  const [_, count] = await service.listAndCount()

  if (count === 0) {
    await service.create({
      company_name: process.env.STORE_NAME || "",
      company_ruc: "",
      company_address: process.env.STORE_ADDRESS || "",
      company_phone: process.env.STORE_PHONE || "",
      company_email: process.env.ADMIN_EMAIL || "",
    })
  }

  // ── Seed default HTML templates ───────────────────────────────────────────
  const templateService: IMedusaInternalService<
    typeof InvoiceTemplate
  > = container.resolve("invoiceTemplateService")

  const [__, tplCount] = await templateService.listAndCount()

  if (tplCount > 0) {
    return
  }

  for (const tpl of DEFAULT_TEMPLATES) {
    await templateService.create({
      name: tpl.name,
      slug: tpl.slug,
      html_content: tpl.html,
      type: tpl.type as TemplateType,
      is_default: true,
      variables_schema: null,
    })
  }
}
