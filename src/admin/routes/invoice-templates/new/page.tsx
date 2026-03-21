import { Container, Heading, Button, Input, Label, Select, toast } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"
import { useNavigate } from "react-router-dom"
import { useState } from "react"

const NewTemplatePage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [type, setType] = useState<string>("order_invoice")

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      sdk.client.fetch<{ invoice_template: { id: string } }>("/admin/invoice-templates", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) => {
      toast.success("Plantilla creada")
      navigate(`/invoice-templates/${data.invoice_template.id}`)
    },
    onError: () => {
      toast.error("Error al crear la plantilla")
    },
  })

  const handleCreate = () => {
    if (!name || !slug) {
      toast.error("Nombre y slug son requeridos")
      return
    }
    createMutation.mutate({
      name,
      slug,
      type,
      html_content: getDefaultHtml(type),
    })
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
          <Select value={type} onValueChange={setType}>
            <Select.Trigger>
              <Select.Value placeholder="Seleccionar tipo" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="order_invoice">Comprobante de Pedido</Select.Item>
              <Select.Item value="quote_proforma">Cotización Proforma</Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Button variant="secondary" onClick={() => navigate("/invoice-templates")}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} isLoading={createMutation.isPending}>
            Crear Plantilla
          </Button>
        </div>
      </div>
    </Container>
  )
}

function getDefaultHtml(type: string): string {
  if (type === "quote_proforma") {
    return `<!DOCTYPE html>
<html>
<head><style>body { font-family: Helvetica, sans-serif; }</style></head>
<body>
<h1>COTIZACIÓN {{quote_number}}</h1>
<p>Fecha: {{date_str}}</p>
<p>Servicio: {{service_name}}</p>
<!-- Personaliza tu plantilla aquí -->
</body>
</html>`
  }
  return `<!DOCTYPE html>
<html>
<head><style>body { font-family: Helvetica, sans-serif; }</style></head>
<body>
<h1>COMPROBANTE {{invoice_id}}</h1>
<p>Fecha: {{invoice_date}}</p>
<p>Empresa: {{company_name}}</p>
<!-- Personaliza tu plantilla aquí -->
</body>
</html>`
}

export default NewTemplatePage
