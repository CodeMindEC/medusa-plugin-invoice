import type { TDocumentDefinitions } from "pdfmake/interfaces"
import type { InferTypeOf } from "@medusajs/framework/types"
import type { InvoiceConfig } from "../models/invoice-config"
import { TemplateNotFoundError } from "../errors"

// ── Build result union ───────────────────────────────────────────────────────

/** Strategies return either a pdfmake doc (fallback) or rendered HTML (for puppeteer) */
export type BuildResult =
    | { type: "pdfmake"; definition: TDocumentDefinitions }
    | { type: "html"; html: string }

// ── Variable category (for admin UI template editor) ─────────────────────────

export interface VariableCategory {
    /** Human-readable label (e.g. "Empresa", "Productos") */
    label: string
    /** Emoji icon for the UI (e.g. "🏢", "📦") */
    icon: string
    /** Available template variables in this category */
    variables: { name: string; isBlock?: boolean }[]
}

// ── Strategy registration metadata ───────────────────────────────────────────

export interface StrategyRegistrationMeta {
    /** Human-readable label for admin UI (e.g. "Comprobante de Pedido") */
    label: string
    /** Variable categories for the template editor sidebar */
    variableCategories?: VariableCategory[]
    /** Sample data builder for live preview in the template editor */
    buildSampleData?: () => Record<string, unknown>
    /** Default HTML content for new templates of this type */
    defaultHtml?: string
}

// ── Core contract ────────────────────────────────────────────────────────────

/**
 * Each document strategy receives its own strongly-typed input and config,
 * and must return a `BuildResult` — either a pdfmake definition or rendered HTML.
 *
 * When `htmlTemplate` is provided, the strategy renders HTML via Handlebars
 * and returns `{ type: "html" }`. Otherwise it builds pdfmake objects directly.
 */
export interface DocumentStrategy<TInput> {
    buildDocumentDefinition(
        input: TInput,
        config: InferTypeOf<typeof InvoiceConfig>,
        htmlTemplate?: string | null
    ): Promise<BuildResult>
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
     * Renders an HTML+Handlebars template string into a final HTML string.
     * The caller (service) will use puppeteer to convert this to PDF.
     */
    protected async renderHtmlTemplate(
        htmlTemplate: string,
        data: Record<string, unknown>
    ): Promise<BuildResult> {
        const Handlebars = (await import("handlebars")).default

        const compiled = Handlebars.compile(htmlTemplate)
        const html = compiled(data)

        return { type: "html", html }
    }

    /**
     * Builds a standardised company-context object from the given config.
     * Strategies spread this into their Handlebars data so every template
     * type has access to the same company variables.
     */
    protected async buildCompanyContext(
        config: InferTypeOf<typeof InvoiceConfig> | null | undefined
    ): Promise<Record<string, string>> {
        const logoBase64 = config?.company_logo
            ? await this.imageUrlToBase64(config.company_logo)
            : ""

        return {
            company_name: config?.company_name ?? "",
            company_ruc: config?.company_ruc ?? "",
            company_address: config?.company_address ?? "",
            company_phone: config?.company_phone ?? "",
            company_email: config?.company_email ?? "",
            company_logo_base64: logoBase64,
        }
    }

    abstract buildDocumentDefinition(
        input: TInput,
        config: InferTypeOf<typeof InvoiceConfig>,
        htmlTemplate?: string | null
    ): Promise<BuildResult>
}

// ── Strategy Registry (Open/Closed Principle) ────────────────────────────────

type StrategyConstructor<TInput> = new () => DocumentStrategy<TInput>

/**
 * A static registry that maps template identifiers to their corresponding
 * strategy implementations. Extend the system by calling `register()` —
 * no modification to the service layer required.
 *
 * Registration is done declaratively via module options in `medusa-config.ts`.
 */
export class TemplateFactory {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static readonly registry = new Map<string, StrategyConstructor<any>>()
    private static readonly metaRegistry = new Map<string, StrategyRegistrationMeta>()

    /**
     * Register a new template strategy with optional UI metadata.
     *
     * @example
     *   TemplateFactory.register("order_invoice", OrderInvoiceStrategy, ORDER_INVOICE_META)
     */
    static register<TInput>(
        templateId: string,
        strategy: StrategyConstructor<TInput>,
        meta?: StrategyRegistrationMeta
    ): void {
        TemplateFactory.registry.set(templateId, strategy)
        if (meta) {
            TemplateFactory.metaRegistry.set(templateId, meta)
        }
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

    /** Get UI metadata for a registered strategy */
    static getMeta(templateId: string): StrategyRegistrationMeta | undefined {
        return TemplateFactory.metaRegistry.get(templateId)
    }

    /** Lists all registered template IDs (useful for admin UIs / debugging) */
    static listRegistered(): string[] {
        return Array.from(TemplateFactory.registry.keys())
    }

    /** Lists all registered strategies with their metadata */
    static listRegisteredWithMeta(): Array<{ id: string; meta?: StrategyRegistrationMeta }> {
        return Array.from(TemplateFactory.registry.keys()).map(id => ({
            id,
            meta: TemplateFactory.metaRegistry.get(id),
        }))
    }
}
