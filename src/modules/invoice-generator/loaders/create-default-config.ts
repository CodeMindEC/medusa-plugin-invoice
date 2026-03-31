import {
  LoaderOptions,
  IMedusaInternalService,
} from "@medusajs/framework/types"
import { InvoiceConfig } from "../models/invoice-config"
import { InvoiceTemplate } from "../models/invoice-template"
import { TemplateFactory } from "../templates/strategy"
import type { InvoiceModuleOptions } from "../../../types/module-options"

export default async function createDefaultConfigLoader({
  container,
  options,
}: LoaderOptions) {
  try {
    const moduleOptions = (options ?? {}) as InvoiceModuleOptions

    // ── Register strategies from module options ─────────────────────────────
    for (const reg of moduleOptions.strategies ?? []) {
      TemplateFactory.register(reg.id, reg.strategy, reg.meta)
    }

    // ── Seed default company config ─────────────────────────────────────────
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

    // ── Seed default templates from registered strategies ────────────────────
    const templateService: IMedusaInternalService<
      typeof InvoiceTemplate
    > = container.resolve("invoiceTemplateService")

    const registered = TemplateFactory.listRegisteredWithMeta()
    for (const { id, meta } of registered) {
      if (!meta?.defaultHtml) continue

      const [existing] = await templateService.listAndCount({
        slug: id,
      })

      if (existing.length > 0) continue

      await templateService.create({
        name: meta.label,
        slug: id,
        html_content: meta.defaultHtml,
        type: id,
        is_default: true,
        variables_schema: null,
      })
    }
  } catch (error: any) {
    // Tables may not exist yet if migrations haven't run.
    // Log warning and let the server start — run `medusa db:migrate` to fix.
    if (error?.code === "42P01" || error?.name === "TableNotFoundException") {
      console.warn(
        "[InvoiceGenerator] Tables not found — run `medusa db:migrate` to create them. Skipping seed."
      )
      return
    }
    throw error
  }
}
