import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INVOICE_MODULE } from "../../../../modules/invoice-generator"
import InvoiceGeneratorService from "../../../../modules/invoice-generator/service"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params
    const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

    const config = await service.retrieveInvoiceConfig(id)

    res.json({ invoice_config: config })
}

export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params
    const body = req.validatedBody ?? req.body
    const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

    const updated = await service.updateInvoiceConfigs({ id, ...(body as Record<string, unknown>) })

    res.json({ invoice_config: updated })
}

export async function DELETE(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params
    const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService

    const config = await service.retrieveInvoiceConfig(id)

    if (config.is_default) {
        throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            "No se puede eliminar la empresa por defecto. Asigne otra empresa como default primero."
        )
    }

    await service.deleteInvoiceConfigs(id)

    res.status(200).json({ id, object: "invoice_config", deleted: true })
}
