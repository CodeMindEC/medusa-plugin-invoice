import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Table, Badge, toast } from "@medusajs/ui"
import { DocumentText } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"
import { useNavigate } from "react-router-dom"

type InvoiceTemplate = {
  id: string
  name: string
  slug: string
  type: "order_invoice" | "quote_proforma"
  is_default: boolean
  created_at: string
  updated_at: string
}

const TYPE_LABELS: Record<string, string> = {
  order_invoice: "Comprobante de Pedido",
  quote_proforma: "Cotización Proforma",
}

const InvoiceTemplatesPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ invoice_templates: InvoiceTemplate[] }>({
    queryFn: () => sdk.client.fetch("/admin/invoice-templates"),
    queryKey: ["invoice-templates"],
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/invoice-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] })
      toast.success("Plantilla eliminada")
    },
    onError: () => {
      toast.error("No se pudo eliminar la plantilla")
    },
  })

  const templates = data?.invoice_templates ?? []

  return (
    <Container>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Heading level="h1">Plantillas de Documentos</Heading>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={() => navigate("/invoice-config")}>
            Configuración
          </Button>
          <Button onClick={() => navigate("/invoice-config/invoice-templates/new")}>
            + Nueva Plantilla
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>Cargando...</div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6c757d" }}>
          No hay plantillas. Se crearán automáticamente al reiniciar el servidor.
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Nombre</Table.HeaderCell>
              <Table.HeaderCell>Slug</Table.HeaderCell>
              <Table.HeaderCell>Tipo</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>Actualizado</Table.HeaderCell>
              <Table.HeaderCell style={{ textAlign: "right" }}>Acciones</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {templates.map((tpl) => (
              <Table.Row
                key={tpl.id}
                onClick={() => navigate(`/invoice-config/invoice-templates/${tpl.id}`)}
                style={{ cursor: "pointer" }}
              >
                <Table.Cell>{tpl.name}</Table.Cell>
                <Table.Cell>
                  <code style={{ fontSize: 12 }}>{tpl.slug}</code>
                </Table.Cell>
                <Table.Cell>{TYPE_LABELS[tpl.type] ?? tpl.type}</Table.Cell>
                <Table.Cell>
                  {tpl.is_default ? (
                    <Badge color="blue">Por defecto</Badge>
                  ) : (
                    <Badge color="grey">Personalizada</Badge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {new Date(tpl.updated_at).toLocaleDateString("es-ES")}
                </Table.Cell>
                <Table.Cell style={{ textAlign: "right" }}>
                  <Button
                    variant="danger"
                    size="small"
                    disabled={tpl.is_default}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm("¿Eliminar esta plantilla?")) {
                        deleteMutation.mutate(tpl.id)
                      }
                    }}
                  >
                    Eliminar
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Plantillas PDF",
  icon: DocumentText,
})

export default InvoiceTemplatesPage
