import type { TDocumentDefinitions } from "pdfmake/interfaces"
import type { InferTypeOf } from "@medusajs/framework/types"
import type { InvoiceConfig } from "../models/invoice-config"
import { TemplateNotFoundError } from "../errors"

// ── Core contract ────────────────────────────────────────────────────────────

/**
 * Each document strategy receives its own strongly-typed input and config,
 * and must return a fully-formed pdfmake `TDocumentDefinitions` object.
 *
 * When `htmlTemplate` is provided, the strategy should use it to render HTML
 * via Handlebars + html-to-pdfmake instead of building pdfmake objects directly.
 */
export interface DocumentStrategy<TInput> {
    buildDocumentDefinition(
        input: TInput,
        config: InferTypeOf<typeof InvoiceConfig>,
        htmlTemplate?: string | null
    ): Promise<TDocumentDefinitions>
}

// ── Shared utility methods ────────────────────────────────────────────────────

/** Supported ISO currency codes with their BCP-47 locale mappings */
const CURRENCY_LOCALE_MAP: Readonly<Record<string, string>> = {
    USD: "en-US",
    EUR: "es-ES",
    MXN: "es-MX",
    COP: "es-CO",
    PEN: "es-PE",
    CLP: "es-CL",
    ARS: "es-AR",
    GBP: "en-GB",
    BRL: "pt-BR",
} as const

export abstract class BaseDocumentStrategy<TInput>
    implements DocumentStrategy<TInput> {
    protected getLocaleForCurrency(currencyCode: string): string {
        return CURRENCY_LOCALE_MAP[currencyCode.toUpperCase()] ?? "es-ES"
    }

    /** Formats a raw numeric amount into a human-readable currency string */
    protected formatAmount(amount: number, currency: string): string {
        const locale = this.getLocaleForCurrency(currency)
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
        }).format(amount)
    }

    /**
     * Downloads an image URL and converts it to a base64 data-URI string
     * suitable for embedding in pdfmake documents.
     *
     * Gracefully returns an empty string on failure so rendering can continue.
     */
    protected async imageUrlToBase64(url: string): Promise<string> {
        const { default: axios } = await import("axios")

        const fullUrl = url.startsWith("/")
            ? `${process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"}${url}`
            : url

        try {
            const response = await axios.get<ArrayBuffer>(fullUrl, {
                responseType: "arraybuffer",
            })
            const base64 = Buffer.from(response.data).toString("base64")
            const mimeType =
                (response.headers["content-type"] as string | undefined) ?? "image/png"
            return `data:${mimeType};base64,${base64}`
        } catch (err) {
            console.warn(`[InvoiceGen] Could not embed image from ${fullUrl}`, err)
            return ""
        }
    }

    /**
     * Renders an HTML+Handlebars template string into a pdfmake
     * `TDocumentDefinitions` using handlebars compilation + html-to-pdfmake.
     */
    protected async renderHtmlTemplate(
        htmlTemplate: string,
        data: Record<string, unknown>
    ): Promise<TDocumentDefinitions> {
        const Handlebars = await import("handlebars")
        const htmlToPdfmake = (await import("html-to-pdfmake")).default
        const { JSDOM } = await import("jsdom")

        const compiled = Handlebars.compile(htmlTemplate)
        const html = compiled(data)

        const { window } = new JSDOM("")
        const content = htmlToPdfmake(html, { window: window as unknown as Window })

        return {
            pageSize: "A4",
            pageMargins: [40, 60, 40, 60],
            content,
            defaultStyle: { font: "Helvetica", fontSize: 10 },
        }
    }

    abstract buildDocumentDefinition(
        input: TInput,
        config: InferTypeOf<typeof InvoiceConfig>,
        htmlTemplate?: string | null
    ): Promise<TDocumentDefinitions>
}

// ── Strategy Registry (Open/Closed Principle) ────────────────────────────────

type StrategyConstructor<TInput> = new () => DocumentStrategy<TInput>

/**
 * A static registry that maps template identifiers to their corresponding
 * strategy implementations. Extend the system by calling `register()` —
 * no modification to the service layer required.
 */
export class TemplateFactory {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static readonly registry = new Map<string, StrategyConstructor<any>>()

    /**
     * Register a new template strategy.
     *
     * @example
     *   TemplateFactory.register("order_invoice", OrderInvoiceStrategy)
     */
    static register<TInput>(
        templateId: string,
        strategy: StrategyConstructor<TInput>
    ): void {
        TemplateFactory.registry.set(templateId, strategy)
    }

    /**
     * Resolve and instantiate the strategy for the given template ID.
     *
     * @throws {TemplateNotFoundError} if no strategy is registered.
     */
    static resolve<TInput>(templateId: string): DocumentStrategy<TInput> {
        const StrategyCtor = TemplateFactory.registry.get(templateId) as
            | StrategyConstructor<TInput>
            | undefined

        if (!StrategyCtor) {
            throw new TemplateNotFoundError(templateId)
        }

        return new StrategyCtor()
    }

    /** Lists all registered template IDs (useful for admin UIs / debugging) */
    static listRegistered(): string[] {
        return Array.from(TemplateFactory.registry.keys())
    }
}
