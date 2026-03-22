import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVOICE_MODULE } from "../../../../../modules/invoice-generator"
import InvoiceGeneratorService from "../../../../../modules/invoice-generator/service"

export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params
    const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

    // Unset all defaults first
    const all = await service.listInvoiceConfigs()
    for (const cfg of all) {
        if (cfg.is_default) {
            await service.updateInvoiceConfigs({ id: cfg.id, is_default: false })
        }
    }

    // Set the requested one as default
    const updated = await service.updateInvoiceConfigs({ id, is_default: true })

    res.json({ invoice_config: updated })
}
