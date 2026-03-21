import { MedusaError } from "@medusajs/framework/utils"

/**
 * Thrown when the service is asked to render a template type
 * that has no registered strategy in the TemplateFactory.
 */
export class TemplateNotFoundError extends MedusaError {
    constructor(templateId: string) {
        super(
            MedusaError.Types.NOT_FOUND,
            `[InvoiceGenerator] No strategy registered for template: "${templateId}". ` +
            `Register it in TemplateFactory before use.`
        )
        this.name = "TemplateNotFoundError"
    }
}

/**
 * Wraps any rendering failure from pdfmake into a consistent,
 * HTTP-friendly error that Medusa's error handler can serialize.
 */
export class PdfGenerationError extends MedusaError {
    readonly cause: unknown

    constructor(templateId: string, cause: unknown) {
        const message =
            cause instanceof Error ? cause.message : String(cause)

        super(
            MedusaError.Types.UNEXPECTED_STATE,
            `[InvoiceGenerator] PDF generation failed for template "${templateId}": ${message}`
        )
        this.name = "PdfGenerationError"
        this.cause = cause
    }
}
