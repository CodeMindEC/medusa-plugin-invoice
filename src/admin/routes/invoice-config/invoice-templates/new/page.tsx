import { Container, Heading, Button, Input, Label, Select, toast } from "@medusajs/ui"
import { useMutation, useQuery } from "@tanstack/react-query"
import { sdk } from "../../../../lib/sdk"
import { useNavigate } from "react-router-dom"
import { useState } from "react"

type StrategyInfo = {
  id: string
  label: string
  hasDefaultHtml: boolean
}

const NewTemplatePage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [type, setType] = useState<string>("")

  // Fetch registered strategies for the type dropdown
  const { data: strategiesData, isLoading: loadingStrategies } = useQuery<{ strategies: StrategyInfo[] }>({
    queryFn: () => sdk.client.fetch("/admin/invoice-strategies"),
    queryKey: ["invoice-strategies"],
  })

  const strategies = strategiesData?.strategies ?? []

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      sdk.client.fetch<{ invoice_template: { id: string } }>("/admin/invoice-templates", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) => {
      toast.success("Plantilla creada")
      navigate(`/invoice-config/invoice-templates/${data.invoice_template.id}`)
    },
    onError: () => {
      toast.error("Error al crear la plantilla")
    },
  })

  const handleCreate = () => {
    if (!name || !slug || !type) {
      toast.error("Nombre, slug y tipo son requeridos")
      return
    }
    createMutation.mutate({
      name,
      slug,
      type,
      html_content: getDefaultHtml(),
    })
  }

  const getDefaultHtml = (): string => {
    return `<!DOCTYPE html>
<html>
<head><style>body { font-family: Helvetica, sans-serif; }</style></head>
<body>
<h1>DOCUMENTO {{document_id}}</h1>
<p>Fecha: {{date}}</p>
<p>Empresa: {{company_name}}</p>
<!-- Personaliza tu plantilla aquí -->
</body>
</html>`
  }

  return (
    <Container>
      <Heading level="h1" style={{ marginBottom: 24 }}>Nueva Plantilla</Heading>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 500 }}>
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Mi Comprobante" />
        </div>

        <div>
          <Label htmlFor="slug">Slug (identificador único)</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
            placeholder="Ej: my_custom_invoice"
          />
        </div>

        <div>
          <Label htmlFor="type">Tipo de documento</Label>
          {loadingStrategies ? (
            <div className="text-ui-fg-subtle text-sm py-2">Cargando estrategias...</div>
          ) : strategies.length === 0 ? (
            <div className="text-ui-fg-subtle text-sm py-2">
              No hay estrategias registradas. Registra estrategias en medusa-config.ts.
            </div>
          ) : (
            <Select value={type} onValueChange={setType}>
              <Select.Trigger>
                <Select.Value placeholder="Seleccionar tipo" />
              </Select.Trigger>
              <Select.Content>
                {strategies.map((s) => (
                  <Select.Item key={s.id} value={s.id}>{s.label}</Select.Item>
                ))}
              </Select.Content>
            </Select>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Button variant="secondary" onClick={() => navigate("/invoice-config/invoice-templates")}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} isLoading={createMutation.isPending} disabled={strategies.length === 0}>
            Crear Plantilla
          </Button>
        </div>
      </div>
    </Container>
  )
}

export default NewTemplatePage
