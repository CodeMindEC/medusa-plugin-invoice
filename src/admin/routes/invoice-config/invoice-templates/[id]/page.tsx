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
  type: string
  is_default: boolean
  variables_schema: Record<string, unknown> | null
  company_id: string | null
}

type InvoiceConfig = {
  id: string
  company_name: string
  is_default?: boolean
}

// ── Dynamic strategy types ───────────────────────────────────────────────────

type VariableInfo = {
  name: string
  isBlock?: boolean
}

type VariableCategoryInfo = {
  label: string
  icon: string
  variables: VariableInfo[]
}

type StrategyInfo = {
  id: string
  label: string
  variableCategories: VariableCategoryInfo[]
  sampleData: Record<string, unknown>
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

  // Fetch registered strategies for dynamic variable categories and sample data
  const { data: strategiesData } = useQuery<{ strategies: StrategyInfo[] }>({
    queryFn: () => sdk.client.fetch("/admin/invoice-strategies"),
    queryKey: ["invoice-strategies"],
  })

  const template = data?.invoice_template
  const companies = companiesData?.invoice_configs ?? []
  const strategiesMap = useMemo(() => {
    const map = new Map<string, StrategyInfo>()
    for (const s of strategiesData?.strategies ?? []) {
      map.set(s.id, s)
    }
    return map
  }, [strategiesData])

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

  // Dynamic sample data from registered strategy
  const currentStrategy = template ? strategiesMap.get(template.type) : undefined

  const previewHtml = useMemo(() => {
    if (!htmlContent || !template) return ""
    try {
      const compiled = Handlebars.compile(htmlContent)
      return compiled(currentStrategy?.sampleData ?? {})
    } catch {
      return `<div style="color:red;padding:20px;">Error en la plantilla Handlebars</div>`
    }
  }, [htmlContent, template, currentStrategy])

  const insertVariable = useCallback((variable: string, isBlock?: boolean) => {
    const insertion = isBlock ? variable : `{{${variable}}}`
    setHtmlContent((prev) => prev + insertion)
  }, [])

  const toggleSection = useCallback((label: string) => {
    setCollapsedSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }, [])

  // Dynamic variable categories from strategy
  const categories = currentStrategy?.variableCategories ?? []

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
            {template.slug} ({currentStrategy?.label ?? template.type})
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

      {/* ── Variables Palette (dynamic from strategy) ───────────────────── */}
      {showVariables && (
        <div className="border-b border-ui-border-base bg-ui-bg-subtle px-4 py-3">
          <Label className="block mb-2 text-sm">Variables Handlebars — click para insertar</Label>
          {categories.length === 0 ? (
            <Text className="text-ui-fg-subtle text-sm">
              No hay categorías de variables definidas para esta estrategia.
            </Text>
          ) : (
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
          )}
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
