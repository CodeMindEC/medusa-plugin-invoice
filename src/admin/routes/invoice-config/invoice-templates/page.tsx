import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Table, Badge, toast, Text } from "@medusajs/ui"
import { DocumentText } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"
import { useNavigate } from "react-router-dom"

type InvoiceTemplate = {
  id: string
  name: string
  slug: string
  type: string
  is_default: boolean
  company_id: string | null
  created_at: string
  updated_at: string
}

type InvoiceConfig = {
  id: string
  company_name: string
}

type StrategyInfo = {
  id: string
  label: string
}

const InvoiceTemplatesPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ invoice_templates: InvoiceTemplate[] }>({
    queryFn: () => sdk.client.fetch("/admin/invoice-templates"),
    queryKey: ["invoice-templates"],
  })

  const { data: companiesData } = useQuery<{ invoice_configs: InvoiceConfig[] }>({
    queryFn: () => sdk.client.fetch("/admin/invoice-config"),
    queryKey: ["invoice-configs"],
  })

  // Fetch registered strategies for dynamic type labels
  const { data: strategiesData } = useQuery<{ strategies: StrategyInfo[] }>({
    queryFn: () => sdk.client.fetch("/admin/invoice-strategies"),
    queryKey: ["invoice-strategies"],
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
  const companiesMap = new Map((companiesData?.invoice_configs ?? []).map((c) => [c.id, c.company_name]))

  // Build dynamic labels from registered strategies
  const typeLabels = new Map((strategiesData?.strategies ?? []).map((s) => [s.id, s.label]))

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Plantillas de Documentos</Heading>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/invoice-config")}>
            ← Panel
          </Button>
          <Button onClick={() => navigate("/invoice-config/invoice-templates/new")}>
            + Nueva Plantilla
          </Button>
        </div>
      </div>

      <div className="px-6 pb-4">
        {isLoading ? (
          <div className="text-center py-10 text-ui-fg-subtle">Cargando...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 text-ui-fg-subtle">
            No hay plantillas. Se crearán automáticamente al reiniciar el servidor.
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Nombre</Table.HeaderCell>
                <Table.HeaderCell>Slug</Table.HeaderCell>
                <Table.HeaderCell>Tipo</Table.HeaderCell>
                <Table.HeaderCell>Empresa</Table.HeaderCell>
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
                  <Table.Cell className="font-medium">{tpl.name}</Table.Cell>
                  <Table.Cell>
                    <code className="text-xs">{tpl.slug}</code>
                  </Table.Cell>
                  <Table.Cell>{typeLabels.get(tpl.type) ?? tpl.type}</Table.Cell>
                  <Table.Cell>
                    <Text className="text-sm">
                      {tpl.company_id ? (companiesMap.get(tpl.company_id) ?? "—") : "—"}
                    </Text>
                  </Table.Cell>
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
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Plantillas PDF",
  icon: DocumentText,
})

export default InvoiceTemplatesPage
