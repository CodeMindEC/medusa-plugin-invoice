import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVOICE_MODULE } from "../../../modules/invoice-generator"
import InvoiceGeneratorService from "../../../modules/invoice-generator/service"

/**
 * GET /admin/invoice-strategies
 *
 * Lists all registered document strategies with their UI metadata.
 * Used by the admin UI to dynamically populate:
 * - Template type dropdown (new template page)
 * - Variable categories (template editor sidebar)
 * - Sample data for live preview
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const service = req.scope.resolve(INVOICE_MODULE) as InvoiceGeneratorService
    const strategies = service.listStrategies()

    // Transform for JSON — buildSampleData is a function, we invoke it here
    const result = strategies.map(({ id, meta }) => ({
        id,
        label: meta?.label ?? id,
        variableCategories: meta?.variableCategories ?? [],
        sampleData: meta?.buildSampleData?.() ?? {},
        hasDefaultHtml: !!meta?.defaultHtml,
    }))

    res.json({ strategies: result })
}
