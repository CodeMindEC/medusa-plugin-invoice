import { Container, Heading, Button, Input, Label, Select, Badge, Text, toast } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../../../lib/sdk"
import { useParams, useNavigate } from "react-router-dom"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { html } from "@codemirror/lang-html"
import { oneDark } from "@codemirror/theme-one-dark"
import Handlebars from "handlebars"

type InvoiceTemplate = {
  id: string
  name: string
  slug: string
  html_content: string
  type: "order_invoice" | "quote_proforma"
  is_default: boolean
  variables_schema: Record<string, unknown> | null
  company_id: string | null
}

type InvoiceConfig = {
  id: string
  company_name: string
  is_default?: boolean
}

// ── Categorized variables ────────────────────────────────────────────────────

type VariableCategory = {
  label: string
  icon: string
  variables: { name: string; isBlock?: boolean }[]
}

const ORDER_INVOICE_CATEGORIES: VariableCategory[] = [
  {
    label: "Empresa",
    icon: "🏢",
    variables: [
      { name: "company_name" }, { name: "company_ruc" }, { name: "company_address" },
      { name: "company_phone" }, { name: "company_email" }, { name: "company_logo_base64" },
    ],
  },
  {
    label: "Documento",
    icon: "📄",
    variables: [
      { name: "invoice_id" }, { name: "invoice_date" },
      { name: "order_display_id" }, { name: "order_date" },
    ],
  },
  {
    label: "Cliente",
    icon: "👤",
    variables: [
      { name: "billing_address" }, { name: "shipping_address" }, { name: "cedula" },
    ],
  },
  {
    label: "Productos",
    icon: "📦",
    variables: [
      { name: "{{#each items}}", isBlock: true },
      { name: "this.title" }, { name: "this.variant_title" },
      { name: "this.quantity" }, { name: "this.unit_price" }, { name: "this.total" },
      { name: "{{/each}}", isBlock: true },
    ],
  },
  {
    label: "Totales",
    icon: "💰",
    variables: [
      { name: "subtotal" }, { name: "tax_total" }, { name: "shipping_total" },
      { name: "discount_total" }, { name: "total" },
    ],
  },
  {
    label: "Otros",
    icon: "📝",
    variables: [
      { name: "is_home_delivery" }, { name: "notes" },
    ],
  },
]

const QUOTE_PROFORMA_CATEGORIES: VariableCategory[] = [
  {
    label: "Empresa",
    icon: "🏢",
    variables: [
      { name: "company_name" }, { name: "company_website" },
    ],
  },
  {
    label: "Documento",
    icon: "📄",
    variables: [
      { name: "quote_number" }, { name: "date_str" }, { name: "service_name" },
      { name: "is_home_delivery" },
    ],
  },
  {
    label: "Configuración",
    icon: "⚙️",
    variables: [
      { name: "{{#each config_fields}}", isBlock: true },
      { name: "this.label" }, { name: "this.value" },
      { name: "{{/each}}", isBlock: true },
    ],
  },
  {
    label: "Desglose",
    icon: "📊",
    variables: [
      { name: "{{#each breakdown}}", isBlock: true },
      { name: "this.label" }, { name: "this.total_formatted" },
      { name: "{{/each}}", isBlock: true },
    ],
  },
  {
    label: "Totales",
    icon: "💰",
    variables: [
      { name: "totals.subtotal_formatted" }, { name: "totals.extras_formatted" },
      { name: "totals.discount_formatted" }, { name: "totals.shipping_formatted" },
      { name: "totals.taxes_provided" }, { name: "totals.taxes_formatted" },
      { name: "totals.total_formatted" },
    ],
  },
  {
    label: "Incluye y Contacto",
    icon: "📋",
    variables: [
      { name: "{{#each includes_left}}", isBlock: true },
      { name: "{{#each includes_right}}", isBlock: true },
      { name: "{{#each contact_rows}}", isBlock: true },
      { name: "this.label" }, { name: "this.value" },
      { name: "{{/each}}", isBlock: true },
    ],
  },
]

const CATEGORIES: Record<string, VariableCategory[]> = {
  order_invoice: ORDER_INVOICE_CATEGORIES,
  quote_proforma: QUOTE_PROFORMA_CATEGORIES,
}

// Placeholder SVG logo encoded as base64 for preview
const PLACEHOLDER_LOGO_BASE64 = "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40"><rect width="120" height="40" rx="4" fill="#e2e8f0"/><text x="60" y="24" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="11">LOGO</text></svg>`)

const SAMPLE_DATA: Record<string, Record<string, unknown>> = {
  order_invoice: {
    company_name: "Mi Empresa",
    company_ruc: "1234567890001",
    company_address: "Av. Principal 123, Quito",
    company_phone: "+593 99 123 4567",
    company_email: "info@miempresa.com",
    company_logo_base64: PLACEHOLDER_LOGO_BASE64,
    invoice_id: "INV-000001",
    invoice_date: "19/06/2025",
    order_display_id: "000042",
    order_date: "18/06/2025",
    billing_address: "Juan Pérez\nCalle Ejemplo 456\nQuito, Pichincha",
    shipping_address: "Juan Pérez\nCalle Ejemplo 456\nQuito, Pichincha",
    cedula: "1712345678",
    items: [
      { title: "Producto ejemplo", variant_title: "Grande", quantity: "2", unit_price: "$25.00", total: "$50.00" },
      { title: "Otro producto", variant_title: "", quantity: "1", unit_price: "$15.00", total: "$15.00" },
    ],
    subtotal: "$65.00",
    tax_total: "$7.80",
    shipping_total: "$5.00",
    discount_total: "",
    total: "$77.80",
    is_home_delivery: false,
    notes: "Gracias por su compra.",
  },
  quote_proforma: {
    company_name: "Mi Empresa",
    company_website: "www.miempresa.com",
    quote_number: "QP-2025-0001",
    date_str: "19/06/2025",
    service_name: "SERVICIO DE EJEMPLO",
    config_fields: [
      { label: "Nro. personas", value: "50" },
      { label: "Menú", value: "Premium" },
    ],
    breakdown: [
      { label: "Servicio base", total_formatted: "$500.00" },
      { label: "Extras", total_formatted: "$100.00" },
    ],
    totals: {
      subtotal_formatted: "$500.00",
      extras_formatted: "$100.00",
      discount: 0, discount_formatted: "",
      shipping: 25, shipping_formatted: "$25.00",
      taxes_provided: true, taxes_formatted: "$75.00",
      total_formatted: "700.00",
    },
    is_home_delivery: false,
    includes: ["Vajilla", "Mantelería", "Personal", "Montaje"],
    includes_left: ["Vajilla", "Personal"],
    includes_right: ["Mantelería", "Montaje"],
    contact_rows: [
      { label: "Nombre", value: "María García" },
      { label: "Email", value: "maria@ejemplo.com" },
    ],
  },
}

const TemplateEditorPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const editorRef = useRef<any>(null)

  const { data, isLoading } = useQuery<{ invoice_template: InvoiceTemplate }>({
    queryFn: () => sdk.client.fetch(`/admin/invoice-templates/${id}`),
    queryKey: ["invoice-template", id],
    enabled: !!id,
  })

  const { data: companiesData } = useQuery<{ invoice_configs: InvoiceConfig[] }>({
    queryFn: () => sdk.client.fetch("/admin/invoice-config"),
    queryKey: ["invoice-configs"],
  })

  const template = data?.invoice_template
  const companies = companiesData?.invoice_configs ?? []
  const [name, setName] = useState("")
  const [htmlContent, setHtmlContent] = useState("")
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [showVariables, setShowVariables] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (template) {
      setName(template.name)
      setHtmlContent(template.html_content)
      setCompanyId(template.company_id)
    }
  }, [template])

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/invoice-templates/${id}`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-template", id] })
      toast.success("Plantilla guardada")
    },
    onError: () => {
      toast.error("Error al guardar")
    },
  })

  const handleSave = () => {
    saveMutation.mutate({ name, html_content: htmlContent, company_id: companyId })
  }

  const handlePreviewPdf = async () => {
    try {
      const response = await fetch(`/admin/invoice-templates/${id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      if (!response.ok) throw new Error("Preview failed")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } catch {
      toast.error("Error al generar preview PDF")
    }
  }

  const handleRestoreDefault = async () => {
    if (!template?.is_default) return
    if (!confirm("¿Restaurar la plantilla a su contenido original?")) return
    try {
      await sdk.client.fetch<{ invoice_template: InvoiceTemplate }>(
        `/admin/invoice-templates/${id}/restore`,
        { method: "POST" }
      )
      toast.success("Plantilla restaurada")
      queryClient.invalidateQueries({ queryKey: ["invoice-template", id] })
    } catch {
      toast.error("Error al restaurar la plantilla")
    }
  }

  const previewHtml = useMemo(() => {
    if (!htmlContent || !template) return ""
    try {
      const compiled = Handlebars.compile(htmlContent)
      return compiled(SAMPLE_DATA[template.type] ?? {})
    } catch {
      return `<div style="color:red;padding:20px;">Error en la plantilla Handlebars</div>`
    }
  }, [htmlContent, template])

  const insertVariable = useCallback((variable: string, isBlock?: boolean) => {
    const insertion = isBlock ? variable : `{{${variable}}}`
    setHtmlContent((prev) => prev + insertion)
  }, [])

  const toggleSection = useCallback((label: string) => {
    setCollapsedSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }, [])

  const categories = template ? (CATEGORIES[template.type] ?? []) : []

  if (isLoading) {
    return <Container><div className="text-center py-10">Cargando...</div></Container>
  }

  if (!template) {
    return <Container><div className="text-center py-10">Plantilla no encontrada</div></Container>
  }

  return (
    <Container className="p-0">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ui-border-base">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="small" onClick={() => navigate("/invoice-config/invoice-templates")}>
            ← Volver
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-semibold text-base w-64"
          />
          <Text className="text-ui-fg-muted text-xs">
            {template.slug} ({template.type})
          </Text>
        </div>
        <div className="flex items-center gap-2">
          {/* Company selector */}
          <Select
            value={companyId ?? "__none__"}
            onValueChange={(v) => setCompanyId(v === "__none__" ? null : v)}
          >
            <Select.Trigger className="w-48">
              <Select.Value placeholder="Empresa" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="__none__">Sin empresa (usa default)</Select.Item>
              {companies.map((c) => (
                <Select.Item key={c.id} value={c.id}>
                  {c.company_name}{c.is_default ? " ★" : ""}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          {template.is_default && (
            <Button variant="secondary" size="small" onClick={handleRestoreDefault}>
              Restaurar
            </Button>
          )}
          <Button variant="secondary" size="small" onClick={() => setShowVariables(!showVariables)}>
            {showVariables ? "Ocultar Variables" : "Variables"}
          </Button>
          <Button variant="secondary" size="small" onClick={handlePreviewPdf}>
            Preview PDF
          </Button>
          <Button onClick={handleSave} isLoading={saveMutation.isPending}>
            Guardar
          </Button>
        </div>
      </div>

      {/* ── Variables Palette (categorized) ────────────────────────────── */}
      {showVariables && (
        <div className="border-b border-ui-border-base bg-ui-bg-subtle px-4 py-3">
          <Label className="block mb-2 text-sm">Variables Handlebars — click para insertar</Label>
          <div className="flex flex-col gap-2">
            {categories.map((cat) => (
              <div key={cat.label} className="border border-ui-border-base rounded-lg bg-ui-bg-base overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-ui-bg-subtle-hover transition-colors"
                  onClick={() => toggleSection(cat.label)}
                >
                  <span>{cat.icon} {cat.label}</span>
                  <span className="text-ui-fg-muted text-xs">
                    {collapsedSections[cat.label] ? "▸" : "▾"} {cat.variables.length}
                  </span>
                </button>
                {!collapsedSections[cat.label] && (
                  <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                    {cat.variables.map((v, i) => (
                      <Badge
                        key={`${cat.label}-${i}`}
                        color={v.isBlock ? "orange" : "blue"}
                        className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
                        onClick={() => insertVariable(v.name, v.isBlock)}
                      >
                        {v.isBlock ? v.name : `{{${v.name}}}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Editor + Preview ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 16, height: "calc(100vh - 260px)", padding: 16 }}>
        {/* Editor Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Label className="mb-2">Editor HTML + Handlebars</Label>
          <div className="flex-1 border border-ui-border-base rounded-lg overflow-hidden">
            <CodeMirror
              ref={editorRef}
              value={htmlContent}
              onChange={(value) => setHtmlContent(value)}
              extensions={[html()]}
              theme={oneDark}
              height="100%"
              style={{ height: "100%" }}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Label className="mb-2">Preview en vivo (datos de ejemplo)</Label>
          <div className="flex-1 border border-ui-border-base rounded-lg overflow-auto bg-white">
            <iframe
              srcDoc={previewHtml}
              style={{ width: "100%", height: "100%", border: "none" }}
              sandbox="allow-same-origin"
              title="Template Preview"
            />
          </div>
        </div>
      </div>
    </Container>
  )
}

export default TemplateEditorPage
