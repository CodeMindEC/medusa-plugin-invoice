import type {
    TDocumentDefinitions,
    ContentText,
    TableCellProperties,
    CustomTableLayout,
} from "pdfmake/interfaces"
import type { InferTypeOf } from "@medusajs/framework/types"
import type { InvoiceConfig } from "../models/invoice-config"
import { BaseDocumentStrategy, type BuildResult } from "./strategy"

// ── Input types ───────────────────────────────────────────────────────────────

export type ProformaConfigField = {
    label: string
    value: string
}

export type ProformaLineItem = {
    label: string
    total: number
}

type ProformaDisplayLineItem = {
    label: string
    total?: number
    note?: string
}

export type QuoteCustomerInfo = {
    name: string
    email: string
    phone: string
    cedula?: string
    eventDate: string
    eventTime: string
    province?: string
    city?: string
    address?: string
    addressDetails?: string
}

export type QuoteScheduleRules = {
    minAdvanceDays: number
    maxAdvanceDays: number
    minEventTime: string
    maxEventTime: string
}

export type QuoteProformaInput = {
    /** Strapi identifier of the selected service */
    serviceType: string
    /** Scheduling rules echoed by frontend and cross-checked in backend */
    scheduleRules: QuoteScheduleRules
    /** Human-readable service name */
    serviceName: string
    /** Key/value pairs from the pricing strategy config */
    configFields: ProformaConfigField[]
    /** Itemized price breakdown from the strategy calculator */
    breakdown: ProformaLineItem[]
    /** Features included in the service package */
    includes: string[]
    /** Client contact data — null for anonymous previews */
    customerInfo: QuoteCustomerInfo | null
    totals: {
        subtotal: number
        extras: number
        shipping?: number
        discount?: number
        taxes?: number
        total: number
    }
    dateStr: string
    quoteNumber: string
    isHomeDelivery?: boolean
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
    headerBg: "#121212",
    darkBg: "#1c1c1c",
    sectionBg: "#262626",
    gold: "#d4af37",
    goldLight: "#f5ebb4",
    goldDark: "#a0821e",
    white: "#ffffff",
    gray100: "#f2f2f2",
    gray300: "#c8c8c8",
    gray500: "#8c8c8c",
    gray800: "#282828",
    success: "#27ae60",
    warning: "#c0392b",
} as const

const L = {
    pageHorizontal: 40,
    rowPadX: 10,
    rowPadY: 6,
    sectionGap: 20,
    sectionTitleGap: 10,
    headerHeight: 96,
} as const

// ── Type helper ───────────────────────────────────────────────────────────────
// pdfmake TableCell union tries to match ContentTocItem (requires `tocItem`)
// when a cell has `text`. Cast explicitly to the correct branch.
type PdfCell = ContentText & TableCellProperties

function tc(cell: Partial<ContentText & TableCellProperties>): PdfCell {
    return cell as PdfCell
}

const zebra = (index: number): string => (index % 2 === 0 ? C.gray100 : C.white)

// ── Reusable table layouts ────────────────────────────────────────────────────

const goldBorderLayout: CustomTableLayout = {
    hLineWidth: () => 0,
    vLineWidth: (i) => (i === 0 ? 2 : 0),
    vLineColor: () => C.goldDark,
    paddingLeft: () => L.rowPadX,
    paddingRight: () => L.rowPadX,
    paddingTop: () => L.rowPadY,
    paddingBottom: () => L.rowPadY,
}

const breakdownLayout: CustomTableLayout = {
    hLineWidth: () => 0,
    vLineWidth: (i) => (i === 0 ? 2 : 0),
    vLineColor: () => C.gold,
    paddingLeft: () => L.rowPadX,
    paddingRight: () => L.rowPadX,
    paddingTop: () => L.rowPadY,
    paddingBottom: () => L.rowPadY,
}

const bannerLayout: CustomTableLayout = {
    hLineWidth: () => 0,
    vLineWidth: (i) => (i === 0 ? 3 : 0),
    vLineColor: () => C.gold,
    paddingLeft: () => 12,
    paddingRight: () => 12,
    paddingTop: () => 8,
    paddingBottom: () => 8,
}

const totalLayout: CustomTableLayout = {
    hLineWidth: () => 0,
    vLineWidth: (i) => (i === 0 ? 4 : 0),
    vLineColor: () => C.gold,
    paddingLeft: () => 12,
    paddingRight: () => 12,
    paddingTop: () => 10,
    paddingBottom: () => 10,
}

// ── Strategy ──────────────────────────────────────────────────────────────────

export class QuoteProformaStrategy extends BaseDocumentStrategy<QuoteProformaInput> {
    async buildDocumentDefinition(
        input: QuoteProformaInput,
        _config: InferTypeOf<typeof InvoiceConfig>,
        htmlTemplate?: string | null
    ): Promise<BuildResult> {

        // ── If HTML template provided, render via Handlebars → HTML string ──
        if (htmlTemplate) {
            return this.buildFromHtml(htmlTemplate, input, _config)
        }

        // ── Fallback: original pdfmake definition ──────────────────────────────

        const rawContactRows: [string, string | undefined][] = input.customerInfo ? [
            ["Nombre", input.customerInfo.name],
            ["Email", input.customerInfo.email],
            ["Teléfono", input.customerInfo.phone],
            ["Cédula / RUC", input.customerInfo.cedula],
            ["Fecha del evento", input.customerInfo.eventDate],
            ["Hora del evento", input.customerInfo.eventTime],
            ["Provincia", input.customerInfo.province],
            ["Ciudad", input.customerInfo.city],
            ["Dirección", input.customerInfo.address],
            ["Detalles", input.customerInfo.addressDetails],
        ] : []

        const contactRows = rawContactRows.filter((row): row is [string, string] => Boolean(row[1]) && row[1] !== "—" && row[1] !== "")
        const subtotal = input.totals.subtotal ?? 0
        const extras = input.totals.extras ?? 0
        const shipping = input.totals.shipping ?? 0
        const discount = input.totals.discount ?? 0
        const taxesProvided = typeof input.totals.taxes === "number" && Number.isFinite(input.totals.taxes)
        const rawTaxes = taxesProvided ? input.totals.taxes! : (input.totals.total - (subtotal + extras + shipping - discount))
        const taxes = Number.isFinite(rawTaxes) ? Math.max(0, Number(rawTaxes.toFixed(2))) : 0
        // IVA/impuestos se muestran solo en el resumen de costos.
        const breakdownRows: ProformaDisplayLineItem[] = input.breakdown.filter(
            (line) => !/iva|impuesto/i.test(line.label)
        )
        const summaryRows: PdfCell[][]
            = [
                this.buildTotalRow("Subtotal de servicio", input.totals.subtotal, C.gray100),
                this.buildTotalRow("Total extras", input.totals.extras, C.white),
                ...(input.totals.discount ? [this.buildTotalRow("Descuento", -input.totals.discount, C.gray100)] : []),
                ...(input.totals.shipping && !input.isHomeDelivery ? [this.buildTotalRow("Costo de envío (Delivery)", input.totals.shipping, C.white)] : []),
                taxesProvided
                    ? this.buildTotalRow("Impuestos (IVA)", taxes, C.gray100)
                    : this.buildInfoRow("Impuestos (IVA)", "Cálculo pendiente al confirmar la reserva.", C.gray100, C.warning),
            ]
        const totalSummaryStack: any[] = [
            {
                table: {
                    widths: ["*", 130],
                    body: summaryRows,
                },
                layout: "noBorders",
            },
            {
                canvas: [{ type: "line", x1: 0, y1: 4, x2: 515, y2: 4, lineWidth: 1, lineColor: C.gold }],
                margin: [0, 2, 0, 6] as [number, number, number, number],
            },
            {
                table: {
                    widths: ["*"],
                    body: [[
                        {
                            fillColor: C.darkBg,
                            border: [false, false, false, false] as [boolean, boolean, boolean, boolean],
                            columns: [
                                {
                                    stack: [
                                        { text: "TOTAL A PAGAR", color: C.gray300, fontSize: 9, bold: true },
                                        { text: "DÓLARES AMERICANOS", color: C.gray500, fontSize: 7, margin: [0, 2, 0, 0] as [number, number, number, number] },
                                    ],
                                    margin: [4, 0, 0, 0] as [number, number, number, number],
                                },
                                {
                                    text: `$${input.totals.total.toFixed(2)}`,
                                    color: C.gold, fontSize: 31, bold: true, alignment: "right",
                                    margin: [0, 0, 0, 0] as [number, number, number, number],
                                },
                            ],
                        },
                    ]],
                },
                layout: totalLayout,
            },
        ]
        if (!taxesProvided) {
            totalSummaryStack.push({
                text: "Total referencial: el valor final se confirmará una vez aplicado el cálculo de impuestos.",
                color: C.warning,
                bold: true,
                fontSize: 9,
                alignment: "right",
                margin: [0, 6, 2, 0] as [number, number, number, number],
            })
        }

        const docDef: TDocumentDefinitions = {
            pageSize: "A4",
            pageMargins: [L.pageHorizontal, 112, L.pageHorizontal, 88],

            header: {
                margin: [0, 0, 0, 0],
                stack: [
                    // Background drawn absolutely
                    {
                        canvas: [
                            { type: "rect", x: 0, y: 0, w: 595.28, h: L.headerHeight, color: C.headerBg },
                            { type: "rect", x: 0, y: L.headerHeight - 3, w: 595.28, h: 2, color: C.gold },
                        ],
                        absolutePosition: { x: 0, y: 0 }
                    },
                    // Content respects standard margins
                    {
                        margin: [L.pageHorizontal, 20, L.pageHorizontal, 0],
                        columns: [
                            {
                                width: "*",
                                stack: [
                                    { text: "LA TASCA", color: C.gold, fontSize: 24, bold: true, margin: [0, 0, 0, 1] as [number, number, number, number] },
                                    { text: "Contacto Empresarial", color: C.gray300, fontSize: 9, margin: [0, 1, 0, 0] as [number, number, number, number] },
                                ],
                            },
                            {
                                width: 190,
                                stack: [
                                    { text: "COTIZACIÓN", color: C.gray500, fontSize: 9, bold: true, alignment: "right", margin: [0, 2, 0, 0] as [number, number, number, number] },
                                    {
                                        canvas: [{ type: "line", x1: 0, y1: 0, x2: 28, y2: 0, lineWidth: 1.5, lineColor: C.gold }],
                                        margin: [0, 6, 0, 8],
                                        alignment: "right",
                                    },
                                    { text: `Nro. de Proforma: ${input.quoteNumber}`, color: C.gray300, fontSize: 9, lineHeight: 1.35, alignment: "right", margin: [0, 2, 0, 0] as [number, number, number, number] },
                                    { text: `Fecha: ${input.dateStr}`, color: C.gray300, fontSize: 9, lineHeight: 1.35, alignment: "right", margin: [0, 2, 0, 0] as [number, number, number, number] },
                                    { text: "Válida por 15 días", color: C.gray300, fontSize: 9, lineHeight: 1.35, alignment: "right", margin: [0, 2, 0, 0] as [number, number, number, number] },
                                ],
                            },
                        ],
                    },
                ],
            },

            footer: (currentPage: number, pageCount: number) => ({
                margin: [0, 0, 0, 0],
                stack: [
                    {
                        canvas: [
                            { type: "rect", x: 0, y: 0, w: 595.28, h: 1.5, color: C.gold },
                            { type: "rect", x: 0, y: 1.5, w: 595.28, h: 80, color: C.headerBg },
                        ],
                    },
                    {
                        absolutePosition: { x: L.pageHorizontal, y: 10 },
                        width: 595.28 - (L.pageHorizontal * 2),
                        stack: [
                            { text: "Gracias por tu confianza. Nuestro equipo ha recibido tu solicitud y se pondrá en contacto contigo a la brevedad.", color: C.gray300, fontSize: 8, alignment: "center" },
                            { text: "Esta cotización es informativa y no constituye un contrato. Los precios pueden variar.", color: C.gray500, fontSize: 7, alignment: "center", margin: [0, 5, 0, 0] as [number, number, number, number] },
                            {
                                columnGap: 10,
                                columns: [
                                    { text: "", width: "*" },
                                    { text: "www.latasca.com.ec", color: C.gold, fontSize: 8, bold: true, alignment: "center", width: "auto" },
                                    {
                                        text: `Página ${currentPage} de ${pageCount}  •  ${input.quoteNumber}`,
                                        color: C.gray500,
                                        fontSize: 7,
                                        alignment: "right",
                                        width: "*",
                                        margin: [0, 0, 8, 0] as [number, number, number, number],
                                    },
                                ],
                                margin: [0, 5, 0, 0] as [number, number, number, number],
                            },
                        ],
                    },
                ],
            }),

            content: [
                // ── Service banner ─────────────────────────────────────────────────
                {
                    margin: [0, 12, 0, 24] as [number, number, number, number],
                    table: {
                        widths: ["*"],
                        body: [[
                            {
                                fillColor: C.goldLight,
                                border: [false, false, false, false] as [boolean, boolean, boolean, boolean],
                                stack: [
                                    { text: "TIPO DE SERVICIO", color: C.gray500, fontSize: 7, bold: true },
                                    { text: input.serviceName.toUpperCase(), color: C.gray800, fontSize: 15, bold: true, margin: [0, 4, 0, 0] as [number, number, number, number] },
                                ],
                                margin: [6, 4, 6, 4] as [number, number, number, number],
                            },
                        ]],
                    },
                    layout: bannerLayout,
                },

                // ── Configuration details ──────────────────────────────────────────
                ...(input.configFields.length > 0 ? [
                    this.buildSectionTitle("Detalles de la Configuración"),
                    {
                        margin: [0, 0, 0, L.sectionGap] as [number, number, number, number],
                        table: {
                            widths: ["42%", "*"],
                            body: input.configFields.map((f, i) => [
                                tc({ text: f.label, color: C.gray500, fontSize: 9, lineHeight: 1.2, fillColor: zebra(i), border: [false, false, false, false], margin: [0, 0, 0, 0] }),
                                tc({ text: f.value, color: C.gray800, fontSize: 9.5, lineHeight: 1.2, bold: true, alignment: "right", fillColor: zebra(i), border: [false, false, false, false], margin: [0, 0, 0, 0] }),
                            ]),
                        },
                        layout: goldBorderLayout,
                    },
                ] : []),

                // ── Price breakdown ────────────────────────────────────────────────
                ...(input.breakdown.length > 0 ? [
                    this.buildSectionTitle("Desglose de Costos"),
                    {
                        margin: [0, 0, 0, L.sectionGap] as [number, number, number, number],
                        table: {
                            widths: ["*", "auto"],
                            body: breakdownRows.map((item, i) => [
                                tc({ text: item.label, color: C.gray800, fontSize: 9.5, lineHeight: 1.2, fillColor: zebra(i), border: [false, false, false, false], margin: [0, 0, 0, 0] }),
                                tc({
                                    text: item.note ?? `$${(item.total ?? 0).toFixed(2)}`,
                                    color: item.note ? C.warning : C.gray800,
                                    italics: !!item.note,
                                    fontSize: item.note ? 8.5 : 10,
                                    bold: !item.note,
                                    alignment: "right",
                                    fillColor: zebra(i),
                                    border: [false, false, false, false],
                                    margin: [0, 0, 0, 0]
                                }),
                            ]),
                        },
                        layout: breakdownLayout,
                    },
                ] : []),

                // ── Cost summary ───────────────────────────────────────────────────
                this.buildSectionTitle("Resumen de Costos"),
                {
                    margin: [0, 0, 0, 24] as [number, number, number, number],
                    stack: totalSummaryStack,
                },

                ...(input.isHomeDelivery ? [{
                    margin: [0, 0, 0, 24] as [number, number, number, number],
                    table: {
                        widths: ["*"],
                        body: [[
                            {
                                fillColor: "#fff7e6",
                                border: [false, false, false, false] as [boolean, boolean, boolean, boolean],
                                stack: [
                                    { text: "AVISO SOBRE TRANSPORTE", color: C.warning, fontSize: 8, bold: true },
                                    {
                                        text: "El valor de transporte no está incluido en esta proforma y deberá cotizarse aparte directamente con el vendedor.",
                                        color: C.gray800,
                                        fontSize: 9,
                                        lineHeight: 1.3,
                                        margin: [0, 4, 0, 0] as [number, number, number, number],
                                    },
                                ],
                                margin: [6, 4, 6, 4] as [number, number, number, number],
                            },
                        ]],
                    },
                    layout: bannerLayout,
                }] : []),

                // ── Includes ──────────────────────────────────────────────────────
                ...(input.includes.length > 0 ? [
                    this.buildSectionTitle("¿Qué Incluye?"),
                    {
                        margin: [0, 0, 0, 24] as [number, number, number, number],
                        columnGap: 24,
                        columns: [
                            { width: "*", stack: input.includes.filter((_, i) => i % 2 === 0).map(this.buildIncludeRow) },
                            { width: "*", stack: input.includes.filter((_, i) => i % 2 !== 0).map(this.buildIncludeRow) },
                        ],
                    },
                ] : []),

                // ── Client info ────────────────────────────────────────────────────
                ...(contactRows.length > 0 ? [
                    this.buildSectionTitle("Información del Cliente"),
                    {
                        margin: [0, 0, 0, 18] as [number, number, number, number],
                        unbreakable: true,
                        table: {
                            widths: ["36%", "*"],
                            body: contactRows.map(([label, value], i) => [
                                tc({ text: label, color: C.gray500, fontSize: 9, lineHeight: 1.2, fillColor: zebra(i), border: [false, false, false, false], margin: [0, 0, 0, 0] }),
                                tc({ text: value, color: C.gray800, fontSize: 9.5, lineHeight: 1.25, bold: true, alignment: "left", fillColor: zebra(i), border: [false, false, false, false], margin: [0, 0, 0, 0] }),
                            ]),
                        },
                        layout: goldBorderLayout,
                    },
                ] : []),
            ],

            defaultStyle: { font: "Helvetica" },
        }

        return { type: "pdfmake" as const, definition: docDef }
    }

    // ── Private helpers ─────────────────────────────────────────────────────────

    private buildSectionTitle(title: string) {
        return {
            margin: [0, 0, 0, L.sectionTitleGap] as [number, number, number, number],
            table: {
                widths: ["*"],
                body: [[
                    tc({ text: title.toUpperCase(), fillColor: C.sectionBg, border: [false, false, false, false], color: C.gold, fontSize: 10, bold: true, margin: [2, 0, 0, 0] }),
                ]],
            },
            layout: bannerLayout,
        }
    }

    private buildTotalRow(label: string, amount: number, bg: string): PdfCell[] {
        return [
            tc({ text: label, color: C.gray500, fontSize: 9.5, lineHeight: 1.2, border: [false, false, false, false], fillColor: bg, margin: [8, 5, 8, 5] }),
            tc({ text: `$${amount.toFixed(2)}`, color: C.gray800, fontSize: 10, bold: true, alignment: "right", border: [false, false, false, false], fillColor: bg, margin: [8, 5, 8, 5] }),
        ]
    }

    private buildInfoRow(label: string, message: string, bg: string, color: string = C.gray500): PdfCell[] {
        return [
            tc({ text: label, color, fontSize: 9.5, lineHeight: 1.2, bold: true, border: [false, false, false, false], fillColor: bg, margin: [8, 5, 8, 5] }),
            tc({ text: message, color, fontSize: 8.5, italics: true, alignment: "right", border: [false, false, false, false], fillColor: bg, margin: [8, 5, 8, 5] }),
        ]
    }

    private buildIncludeRow = (inc: string) => ({
        columns: [
            {
                margin: [0, 2, 4, 0] as [number, number, number, number],
                canvas: [{
                    type: "polyline",
                    lineWidth: 1.6,
                    lineColor: C.success,
                    lineJoin: "round",
                    lineCap: "round",
                    points: [{ x: 0.5, y: 4.5 }, { x: 4, y: 8 }, { x: 10, y: 1 }],
                }],
                width: 14,
            } as any,
            { text: inc, color: C.gray800, fontSize: 8.5, lineHeight: 1.2, width: "*", margin: [0, 1, 0, 0] as [number, number, number, number] },
        ],
        margin: [0, 0, 0, 7] as [number, number, number, number],
    } as any)

    private async buildFromHtml(
        htmlTemplate: string,
        input: QuoteProformaInput,
        config: InferTypeOf<typeof InvoiceConfig>
    ): Promise<BuildResult> {
        const fmt = (n: number) => `$${n.toFixed(2)}`
        const taxesProvided = typeof input.totals.taxes === "number" && Number.isFinite(input.totals.taxes)
        const rawTaxes = taxesProvided
            ? input.totals.taxes!
            : (input.totals.total - (input.totals.subtotal + input.totals.extras + (input.totals.shipping ?? 0) - (input.totals.discount ?? 0)))
        const taxes = Number.isFinite(rawTaxes) ? Math.max(0, Number(rawTaxes!.toFixed(2))) : 0

        const breakdownRows = input.breakdown
            .filter(line => !/iva|impuesto/i.test(line.label))
            .map(item => ({
                label: item.label,
                total_formatted: fmt(item.total),
            }))

        const contactRows: Array<{ label: string; value: string }> = []
        if (input.customerInfo) {
            const raw: [string, string | undefined][] = [
                ["Nombre", input.customerInfo.name],
                ["Email", input.customerInfo.email],
                ["Teléfono", input.customerInfo.phone],
                ["Cédula / RUC", input.customerInfo.cedula],
                ["Fecha del evento", input.customerInfo.eventDate],
                ["Hora del evento", input.customerInfo.eventTime],
                ["Provincia", input.customerInfo.province],
                ["Ciudad", input.customerInfo.city],
                ["Dirección", input.customerInfo.address],
                ["Detalles", input.customerInfo.addressDetails],
            ]
            for (const [label, value] of raw) {
                if (value && value !== "—" && value !== "") {
                    contactRows.push({ label, value })
                }
            }
        }

        const includes = input.includes ?? []

        const companyCtx = await this.buildCompanyContext(config)

        const data: Record<string, unknown> = {
            ...companyCtx,
            company_website: "",
            quote_number: input.quoteNumber,
            date_str: input.dateStr,
            service_name: input.serviceName.toUpperCase(),
            config_fields: input.configFields,
            breakdown: breakdownRows,
            totals: {
                subtotal_formatted: fmt(input.totals.subtotal),
                extras_formatted: fmt(input.totals.extras),
                discount: input.totals.discount ?? 0,
                discount_formatted: input.totals.discount ? fmt(input.totals.discount) : "",
                shipping: input.totals.shipping ?? 0,
                shipping_formatted: input.totals.shipping ? fmt(input.totals.shipping) : "",
                taxes_provided: taxesProvided,
                taxes_formatted: fmt(taxes),
                total_formatted: input.totals.total.toFixed(2),
            },
            is_home_delivery: input.isHomeDelivery ?? false,
            includes,
            includes_left: includes.filter((_, i) => i % 2 === 0),
            includes_right: includes.filter((_, i) => i % 2 !== 0),
            contact_rows: contactRows,
        }

        return this.renderHtmlTemplate(htmlTemplate, data)
    }
}
