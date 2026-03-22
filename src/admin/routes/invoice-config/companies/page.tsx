import { Container, Heading, Button, Table, Badge, toast, Text } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"
import { useNavigate } from "react-router-dom"

type InvoiceConfig = {
    id: string
    company_name: string
    company_ruc?: string
    company_email: string
    company_phone: string
    is_default?: boolean
    updated_at: string
}

const CompaniesPage = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery<{ invoice_configs: InvoiceConfig[] }>({
        queryFn: () => sdk.client.fetch("/admin/invoice-config"),
        queryKey: ["invoice-configs"],
    })

    const setDefaultMutation = useMutation({
        mutationFn: (id: string) =>
            sdk.client.fetch(`/admin/invoice-config/${id}/set-default`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice-configs"] })
            toast.success("Empresa marcada como default")
        },
        onError: () => toast.error("Error al cambiar empresa default"),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            sdk.client.fetch(`/admin/invoice-config/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoice-configs"] })
            toast.success("Empresa eliminada")
        },
        onError: () => toast.error("No se pudo eliminar la empresa"),
    })

    const configs = data?.invoice_configs ?? []

    return (
        <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
                <div>
                    <Heading level="h1">Empresas</Heading>
                    <Text className="text-ui-fg-subtle text-sm mt-1">
                        Empresas emisoras de comprobantes y cotizaciones.
                    </Text>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => navigate("/invoice-config")}>
                        ← Panel
                    </Button>
                    <Button onClick={() => navigate("/invoice-config/companies/new")}>
                        + Nueva Empresa
                    </Button>
                </div>
            </div>

            <div className="px-6 pb-4">
                {isLoading ? (
                    <div className="text-center py-10 text-ui-fg-subtle">Cargando...</div>
                ) : configs.length === 0 ? (
                    <div className="text-center py-10 text-ui-fg-subtle">
                        No hay empresas configuradas.
                    </div>
                ) : (
                    <Table>
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell>Nombre</Table.HeaderCell>
                                <Table.HeaderCell>RUC</Table.HeaderCell>
                                <Table.HeaderCell>Email</Table.HeaderCell>
                                <Table.HeaderCell>Teléfono</Table.HeaderCell>
                                <Table.HeaderCell>Estado</Table.HeaderCell>
                                <Table.HeaderCell style={{ textAlign: "right" }}>Acciones</Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {configs.map((cfg) => (
                                <Table.Row
                                    key={cfg.id}
                                    onClick={() => navigate(`/invoice-config/companies/${cfg.id}`)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <Table.Cell className="font-medium">{cfg.company_name}</Table.Cell>
                                    <Table.Cell>
                                        <code className="text-xs">{cfg.company_ruc || "—"}</code>
                                    </Table.Cell>
                                    <Table.Cell>{cfg.company_email}</Table.Cell>
                                    <Table.Cell>{cfg.company_phone}</Table.Cell>
                                    <Table.Cell>
                                        {cfg.is_default ? (
                                            <Badge color="green">Default</Badge>
                                        ) : (
                                            <Badge color="grey">—</Badge>
                                        )}
                                    </Table.Cell>
                                    <Table.Cell style={{ textAlign: "right" }}>
                                        <div className="flex gap-2 justify-end">
                                            {!cfg.is_default && (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setDefaultMutation.mutate(cfg.id)
                                                        }}
                                                    >
                                                        Default
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (confirm("¿Eliminar esta empresa?")) {
                                                                deleteMutation.mutate(cfg.id)
                                                            }
                                                        }}
                                                    >
                                                        Eliminar
                                                    </Button>
                                                </>
                                            )}
                                        </div>
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

export default CompaniesPage
