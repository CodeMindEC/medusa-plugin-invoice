import { Container, Heading, Button, Input, Label, toast } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"
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
}

const VARIABLES: Record<string, string[]> = {
  order_invoice: [
    "company_name", "company_ruc", "company_address", "company_phone",
    "company_email", "company_logo_base64", "invoice_id", "invoice_date",
    "order_display_id", "order_date", "billing_address", "shipping_address",
    "cedula", "subtotal", "tax_total", "shipping_total", "discount_total",
    "total", "is_home_delivery", "notes",
    "{{#each items}}", "this.title", "this.variant_title", "this.quantity",
    "this.unit_price", "this.total", "{{/each}}",
  ],
  quote_proforma: [
    "company_name", "company_website", "quote_number", "date_str",
    "service_name", "is_home_delivery",
    "{{#each config_fields}}", "this.label", "this.value", "{{/each}}",
    "{{#each breakdown}}", "this.label", "this.total_formatted", "{{/each}}",
    "totals.subtotal_formatted", "totals.extras_formatted",
    "totals.discount_formatted", "totals.shipping_formatted",
    "totals.taxes_provided", "totals.taxes_formatted", "totals.total_formatted",
    "{{#each includes_left}}", "{{#each includes_right}}",
    "{{#each contact_rows}}", "this.label", "this.value", "{{/each}}",
  ],
}

const SAMPLE_DATA: Record<string, Record<string, unknown>> = {
  order_invoice: {
    company_name: "Mi Empresa",
    company_ruc: "1234567890001",
    company_address: "Av. Principal 123, Quito",
    company_phone: "+593 99 123 4567",
    company_email: "info@miempresa.com",
    company_logo_base64: "",
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

  const template = data?.invoice_template
  const [name, setName] = useState("")
  const [htmlContent, setHtmlContent] = useState("")
  const [showVariables, setShowVariables] = useState(false)

  useEffect(() => {
    if (template) {
      setName(template.name)
      setHtmlContent(template.html_content)
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
    saveMutation.mutate({ name, html_content: htmlContent })
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
      const res = await sdk.client.fetch<{ invoice_template: InvoiceTemplate }>(
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

  const insertVariable = useCallback((variable: string) => {
    const isBlock = variable.startsWith("{{#") || variable.startsWith("{{/")
    const insertion = isBlock ? variable : `{{${variable}}}`
    setHtmlContent((prev) => prev + insertion)
  }, [])

  const availableVars = template ? (VARIABLES[template.type] ?? []) : []

  if (isLoading) {
    return <Container><div style={{ textAlign: "center", padding: 40 }}>Cargando...</div></Container>
  }

  if (!template) {
    return <Container><div style={{ textAlign: "center", padding: 40 }}>Plantilla no encontrada</div></Container>
  }

  return (
    <Container>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button variant="secondary" size="small" onClick={() => navigate("/invoice-templates")}>
            ← Volver
          </Button>
          <div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ fontWeight: "bold", fontSize: 16 }}
            />
          </div>
          <code style={{ fontSize: 12, color: "#6c757d" }}>{template.slug} ({template.type})</code>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {template.is_default && (
            <Button variant="secondary" size="small" onClick={handleRestoreDefault}>
              Restaurar Default
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

      {/* ── Variables Palette ─────────────────────────────────────────── */}
      {showVariables && (
        <div style={{
          background: "#f8f9fa",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}>
          <Label style={{ width: "100%", marginBottom: 4 }}>
            Variables Handlebars — click para insertar:
          </Label>
          {availableVars.map((v, i) => (
            <button
              key={i}
              onClick={() => insertVariable(v)}
              style={{
                background: v.startsWith("{{") ? "#e2e8f0" : "#dbeafe",
                border: "1px solid #cbd5e0",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              {v.startsWith("{{") ? v : `{{${v}}}`}
            </button>
          ))}
        </div>
      )}

      {/* ── Editor + Preview ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 16, height: "calc(100vh - 260px)" }}>
        {/* Editor Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Label style={{ marginBottom: 8 }}>Editor HTML + Handlebars</Label>
          <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
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
          <Label style={{ marginBottom: 8 }}>Preview en vivo (datos de ejemplo)</Label>
          <div style={{
            flex: 1,
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            overflow: "auto",
            background: "#fff",
          }}>
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
