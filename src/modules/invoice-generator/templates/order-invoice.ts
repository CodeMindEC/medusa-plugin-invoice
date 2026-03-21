import type { TDocumentDefinitions, CustomTableLayout } from "pdfmake/interfaces"
import type { InferTypeOf } from "@medusajs/framework/types"
import type { InvoiceConfig } from "../models/invoice-config"
import { BaseDocumentStrategy } from "./strategy"

// ── Structural domain types ───────────────────────────────────────────────────
// These are precise interfaces for the fields this template actually reads.
// Using these instead of the abstract `OrderDTO` / `OrderLineItemDTO` types from
// `@medusajs/framework/types` lets the workflow pass query-graph results in
// without any unsafe cast — the concrete query graph objects satisfy these
// structural interfaces natively.

export interface InvoiceOrderAddress {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    country_code?: string | null
    phone?: string | null
    postal_code?: string | null
    metadata?: Record<string, unknown> | null
}

export interface InvoiceLineItem {
    id: string
    title: string
    quantity: number
    unit_price: number
    subtotal?: number | null
    // Optional enriched fields present when variant/product is populated
    variant_title?: string | null
    variant?: { title?: string | null; product?: { title?: string | null } | null } | null
    metadata?: Record<string, unknown> | null
}

export interface InvoiceOrder {
    id: string
    display_id?: number | null
    email?: string | null
    created_at: string | Date
    currency_code?: string | null
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    discount_total?: number | null
    shipping_address?: InvoiceOrderAddress | null
    billing_address?: InvoiceOrderAddress | null
    shipping_methods?: Array<{ name?: string | null; amount?: number | null; shipping_option_id?: string | null }> | null
    items?: InvoiceLineItem[] | null
    metadata?: Record<string, unknown> | null
}

// ── Input type ────────────────────────────────────────────────────────────────

export type OrderInvoiceInput = {
    order: InvoiceOrder
    items: InvoiceLineItem[]
    invoiceDisplayId: number
    created_at: string
}

// ── Type guard ────────────────────────────────────────────────────────────────

/**
 * `InvoiceLineItem` may be enriched with extra fields at runtime.
 * We use a type guard instead of casting to safely access optional extended
 * properties like `variant_title` that come from query-graph population.
 */
function isEnrichedLineItem(item: InvoiceLineItem): item is InvoiceLineItem & { variant_title: string } {
    return typeof (item as { variant_title?: unknown }).variant_title === 'string'
}

// ── Shared table layout ───────────────────────────────────────────────────────

const tableLayout: CustomTableLayout = {
    fillColor: (rowIndex) => (rowIndex === 0 ? "#f8f9fa" : null),
    hLineWidth: (i, node) =>
        i === 0 || i === node.table.body.length ? 0.8 : 0.3,
    vLineWidth: () => 0.3,
    hLineColor: (i, node) =>
        i === 0 || i === node.table.body.length ? "#cbd5e0" : "#e2e8f0",
    vLineColor: () => "#e2e8f0",
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 6,
    paddingBottom: () => 6,
}

// ── Strategy ──────────────────────────────────────────────────────────────────

export class OrderInvoiceStrategy extends BaseDocumentStrategy<OrderInvoiceInput> {
    async buildDocumentDefinition(
        input: OrderInvoiceInput,
        config: InferTypeOf<typeof InvoiceConfig>,
        htmlTemplate?: string | null
    ): Promise<TDocumentDefinitions> {
        const { order, items } = input

        // ── If HTML template provided, render via Handlebars + html-to-pdfmake ──
        if (htmlTemplate) {
            return this.buildFromHtml(htmlTemplate, input, config)
        }

        // ── Fallback: original pdfmake definition ──────────────────────────────
        const itemRows = items.map((raw) => {
            const variantTitle = isEnrichedLineItem(raw) ? raw.variant_title : (raw.variant?.title ?? '')
            const showVariant =
                variantTitle.length > 0 && variantTitle !== "Default Variant"

            return [
                {
                    stack: [
                        { text: raw.title ?? "Artículo desconocido", style: "tableRow", bold: true },
                        ...(showVariant
                            ? [{ text: variantTitle, style: "tableRow", color: "#6b7280", fontSize: 8, margin: [0, 2, 0, 0] as [number, number, number, number] }]
                            : []),
                    ],
                },
                { text: String(raw.quantity), style: "tableRow" },
                { text: this.formatAmount(raw.unit_price, order.currency_code ?? ''), style: "tableRow" },
                { text: this.formatAmount(Number(raw.subtotal ?? 0), order.currency_code ?? ''), style: "tableRow" },
            ]
        })

        const itemsTable = [
            [
                { text: "Artículo", style: "tableHeader" },
                { text: "Cantidad", style: "tableHeader" },
                { text: "Precio Unitario", style: "tableHeader" },
                { text: "Total", style: "tableHeader" },
            ],
            ...itemRows,
        ]

        const invoiceId = `INV-${input.invoiceDisplayId.toString().padStart(6, "0")}`
        const invoiceDate = new Date(input.created_at).toLocaleDateString("es-ES")
        const logoBase64 = config.company_logo
            ? await this.imageUrlToBase64(config.company_logo)
            : ""

        const billingText = this.formatAddress(order.billing_address, "Sin dirección de facturación")
        const shippingText = this.formatAddress(order.shipping_address, "Sin dirección de envío")

        const isHomeDelivery = order.shipping_methods?.some(sm => sm.shipping_option_id === (process.env.HOME_DELIVERY_OPTION_ID || "so_01KAT339XAY8G622P8PSGW7BAZ"))

        const extractCedula = (addr: InvoiceOrderAddress | null | undefined, metadata?: Record<string, unknown> | null): string => {
            const val = addr?.metadata?.cedula ?? metadata?.cedula
            if (!val) return ""
            return `Cédula/RUC: ${val}`
        }
        const cedulaText = extractCedula(order.billing_address, order.metadata) || extractCedula(order.shipping_address, order.metadata)

        const clientStack: any[] = [
            { text: "CLIENTE", style: "sectionHeader", margin: [0, 0, 0, 8] as [number, number, number, number] },
            { text: billingText, style: "addressText" },
        ]
        if (cedulaText) {
            clientStack.push({ text: cedulaText, style: "addressText", margin: [0, 4, 0, 0] as [number, number, number, number] })
        }

        const totalsBody: any[][] = [
            [
                { text: "Subtotal:", style: "totalLabel" },
                { text: this.formatAmount(Number(order.subtotal ?? 0), order.currency_code ?? ''), style: "totalValue" },
            ],
            [
                { text: "Impuestos:", style: "totalLabel" },
                { text: this.formatAmount(Number(order.tax_total ?? 0), order.currency_code ?? ''), style: "totalValue" },
            ],
        ]

        if (!isHomeDelivery && order.shipping_methods && order.shipping_methods.length > 0) {
            totalsBody.push([
                { text: "Envío:", style: "totalLabel" },
                { text: this.formatAmount(Number(order.shipping_methods[0].amount ?? 0), order.currency_code ?? ''), style: "totalValue" },
            ])
        }

        if (order.discount_total) {
            totalsBody.push([
                { text: "Descuento:", style: "totalLabel" },
                { text: this.formatAmount(Number(order.discount_total), order.currency_code ?? ''), style: "totalValue" },
            ])
        }

        totalsBody.push([
            { text: "Total:", style: "totalLabel" },
            { text: this.formatAmount(Number(order.total ?? 0), order.currency_code ?? ''), style: "totalValue" },
        ])

        const docDef: TDocumentDefinitions = {
            pageSize: "A4",
            pageMargins: [40, 60, 40, 60],

            header: {
                margin: [40, 20, 40, 0],
                columns: [
                    {
                        width: "*",
                        stack: [
                            ...(logoBase64
                                ? [
                                    {
                                        image: logoBase64,
                                        width: 80,
                                        height: 40,
                                        fit: [80, 40] as [number, number],
                                        margin: [0, 0, 0, 10] as [number, number, number, number],
                                    },
                                ]
                                : []),
                            {
                                text: config.company_name ?? "Nombre de tu empresa",
                                style: "companyName",
                            },
                        ],
                    },
                    {
                        width: "auto",
                        stack: [
                            {
                                text: "COMPROBANTE DE PEDIDO",
                                style: "invoiceTitle",
                                alignment: "right",
                            },
                        ],
                    },
                ],
            },

            content: [
                {
                    margin: [0, 20, 0, 0] as [number, number, number, number],
                    columns: [
                        // Company details
                        {
                            width: "*",
                            stack: [
                                { text: "DATOS DE LA EMPRESA", style: "sectionHeader", margin: [0, 0, 0, 8] as [number, number, number, number] },
                                ...(config.company_ruc
                                    ? [{ text: `RUC: ${config.company_ruc}`, style: "companyContact", margin: [0, 0, 0, 4] as [number, number, number, number] }]
                                    : []),
                                ...(config.company_address
                                    ? [{ text: config.company_address, style: "companyAddress", margin: [0, 0, 0, 4] as [number, number, number, number] }]
                                    : []),
                                ...(config.company_phone
                                    ? [{ text: config.company_phone, style: "companyContact", margin: [0, 0, 0, 4] as [number, number, number, number] }]
                                    : []),
                                ...(config.company_email
                                    ? [{ text: config.company_email, style: "companyContact" }]
                                    : []),
                            ],
                        },
                        // Invoice meta
                        {
                            width: "auto",
                            table: {
                                widths: [80, 120],
                                body: [
                                    [
                                        { text: "Comprobante N°:", style: "label" },
                                        { text: invoiceId, style: "value" },
                                    ],
                                    [
                                        { text: "Fecha:", style: "label" },
                                        { text: invoiceDate, style: "value" },
                                    ],
                                    [
                                        { text: "Pedido N°:", style: "label" },
                                        { text: String(order.display_id).padStart(6, "0"), style: "value" },
                                    ],
                                    [
                                        { text: "Fecha Pedido:", style: "label" },
                                        { text: new Date(order.created_at).toLocaleDateString("es-ES"), style: "value" },
                                    ],
                                ],
                            },
                            layout: "noBorders",
                            margin: [0, 0, 0, 20] as [number, number, number, number],
                        },
                    ],
                },
                { text: "\n" },
                // Addresses
                {
                    columns: [
                        {
                            width: "*",
                            stack: clientStack,
                        },
                        {
                            width: "*",
                            stack: [
                                { text: "ENVÍO A", style: "sectionHeader", margin: [0, 0, 0, 8] as [number, number, number, number] },
                                { text: shippingText, style: "addressText" },
                            ],
                        },
                    ],
                },
                { text: "\n\n" },
                // Items table
                {
                    table: {
                        headerRows: 1,
                        widths: ["*", "auto", "auto", "auto"],
                        body: itemsTable,
                    },
                    layout: tableLayout,
                },
                { text: "\n" },
                // Totals
                {
                    columns: [
                        { width: "*", text: "" },
                        {
                            width: "auto",
                            table: {
                                widths: ["auto", "auto"],
                                body: totalsBody,
                            },
                            layout: tableLayout,
                        },
                    ],
                },
                { text: "\n\n" },
                // Notes
                ...(isHomeDelivery
                    ? [
                        { text: "AVISO SOBRE TRANSPORTE", style: "warningHeader", margin: [0, 20, 0, 4] as [number, number, number, number] },
                        { text: "El valor de transporte no está incluido en este comprobante y deberá cotizarse aparte directamente con el vendedor.", style: "warningText", margin: [0, 0, 0, 20] as [number, number, number, number] },
                    ]
                    : []),
                ...(config.notes
                    ? [
                        { text: "Notas", style: "sectionHeader", margin: [0, 20, 0, 10] as [number, number, number, number] },
                        { text: config.notes, style: "notesText", margin: [0, 0, 0, 20] as [number, number, number, number] },
                    ]
                    : []),
                { text: "¡Gracias por tu compra!", style: "thankYouText", alignment: "center", margin: [0, 30, 0, 0] as [number, number, number, number] },
                { text: "Este documento es un comprobante de pedido, no constituye factura fiscal.", style: "disclaimerText", alignment: "center", margin: [0, 10, 0, 0] as [number, number, number, number] },
            ],

            styles: {
                companyName: { fontSize: 22, bold: true, color: "#1a365d" },
                companyAddress: { fontSize: 11, color: "#4a5568", lineHeight: 1.3 },
                companyContact: { fontSize: 10, color: "#4a5568" },
                invoiceTitle: { fontSize: 24, bold: true, color: "#2c3e50" },
                label: { fontSize: 10, color: "#6c757d" },
                value: { fontSize: 10, bold: true, color: "#2c3e50" },
                sectionHeader: { fontSize: 12, bold: true, color: "#2c3e50" },
                addressText: { fontSize: 10, color: "#495057", lineHeight: 1.3 },
                tableHeader: { fontSize: 10, bold: true, color: "#ffffff", fillColor: "#495057" },
                tableRow: { fontSize: 9, color: "#495057" },
                totalLabel: { fontSize: 10, bold: true, color: "#495057" },
                totalValue: { fontSize: 10, bold: true, color: "#2c3e50" },
                notesText: { fontSize: 10, color: "#6c757d", italics: true, lineHeight: 1.4 },
                thankYouText: { fontSize: 12, color: "#28a745", italics: true },
                disclaimerText: { fontSize: 8, color: "#6c757d", italics: true },
                warningHeader: { fontSize: 10, bold: true, color: "#d97706" },
                warningText: { fontSize: 10, color: "#d97706", lineHeight: 1.4 },
            },

            defaultStyle: { font: "Helvetica" },
        }

        return docDef
    }

    // ── Private helpers ─────────────────────────────────────────────────────────

    private formatAddress(
        addr: InvoiceOrderAddress | null | undefined,
        fallback: string
    ): string {
        if (!addr) return fallback

        const lines: string[] = [
            `${addr.first_name ?? ''} ${addr.last_name ?? ''}`.trim(),
            addr.address_1 ?? '',
            addr.address_2 ?? '',
            [addr.city, addr.province, addr.postal_code].filter(Boolean).join(", "),
            addr.country_code?.toUpperCase() ?? '',
            addr.phone ?? '',
        ]

        return lines.filter(Boolean).join("\n")
    }

    private async buildFromHtml(
        htmlTemplate: string,
        input: OrderInvoiceInput,
        config: InferTypeOf<typeof InvoiceConfig>
    ): Promise<TDocumentDefinitions> {
        const { order, items } = input
        const currency = order.currency_code ?? "USD"
        const invoiceId = `INV-${input.invoiceDisplayId.toString().padStart(6, "0")}`
        const logoBase64 = config.company_logo
            ? await this.imageUrlToBase64(config.company_logo)
            : ""

        const isHomeDelivery = order.shipping_methods?.some(
            sm => sm.shipping_option_id === (process.env.HOME_DELIVERY_OPTION_ID || "so_01KAT339XAY8G622P8PSGW7BAZ")
        )

        const extractCedula = (addr: InvoiceOrderAddress | null | undefined, metadata?: Record<string, unknown> | null): string => {
            const val = addr?.metadata?.cedula ?? metadata?.cedula
            return val ? String(val) : ""
        }

        const data: Record<string, unknown> = {
            company_name: config.company_name ?? "",
            company_ruc: config.company_ruc ?? "",
            company_address: config.company_address ?? "",
            company_phone: config.company_phone ?? "",
            company_email: config.company_email ?? "",
            company_logo_base64: logoBase64,
            invoice_id: invoiceId,
            invoice_date: new Date(input.created_at).toLocaleDateString("es-ES"),
            order_display_id: String(order.display_id).padStart(6, "0"),
            order_date: new Date(order.created_at).toLocaleDateString("es-ES"),
            billing_address: this.formatAddress(order.billing_address, "Sin dirección de facturación"),
            shipping_address: this.formatAddress(order.shipping_address, "Sin dirección de envío"),
            cedula: extractCedula(order.billing_address, order.metadata) || extractCedula(order.shipping_address, order.metadata),
            items: items.map(raw => {
                const variantTitle = isEnrichedLineItem(raw) ? raw.variant_title : (raw.variant?.title ?? "")
                const showVariant = variantTitle.length > 0 && variantTitle !== "Default Variant"
                return {
                    title: raw.title ?? "Artículo desconocido",
                    variant_title: showVariant ? variantTitle : "",
                    quantity: String(raw.quantity),
                    unit_price: this.formatAmount(raw.unit_price, currency),
                    total: this.formatAmount(Number(raw.subtotal ?? 0), currency),
                }
            }),
            subtotal: this.formatAmount(Number(order.subtotal ?? 0), currency),
            tax_total: this.formatAmount(Number(order.tax_total ?? 0), currency),
            shipping_total: !isHomeDelivery && order.shipping_methods?.[0]
                ? this.formatAmount(Number(order.shipping_methods[0].amount ?? 0), currency)
                : "",
            discount_total: order.discount_total
                ? this.formatAmount(Number(order.discount_total), currency)
                : "",
            total: this.formatAmount(Number(order.total ?? 0), currency),
            is_home_delivery: isHomeDelivery,
            notes: config.notes ?? "",
        }

        return this.renderHtmlTemplate(htmlTemplate, data)
    }
}
