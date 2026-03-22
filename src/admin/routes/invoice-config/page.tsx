import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Badge, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/sdk"
import { useNavigate } from "react-router-dom"

type InvoiceConfig = {
    id: string;
    company_name: string;
    company_ruc?: string;
    company_email: string;
    is_default?: boolean;
}

type InvoiceTemplate = {
    id: string;
    name: string;
    type: string;
}

const InvoiceConfigPage = () => {
    const navigate = useNavigate()

    const { data: configData, isLoading: loadingConfigs } = useQuery<{
        invoice_configs: InvoiceConfig[]
    }>({
        queryFn: () => sdk.client.fetch("/admin/invoice-config"),
        queryKey: ["invoice-configs"],
    })

    const { data: templateData, isLoading: loadingTemplates } = useQuery<{
        invoice_templates: InvoiceTemplate[]
    }>({
        queryFn: () => sdk.client.fetch("/admin/invoice-templates"),
        queryKey: ["invoice-templates"],
    })

    const configs = configData?.invoice_configs ?? []
    const templates = templateData?.invoice_templates ?? []
    const defaultCompany = configs.find((c) => c.is_default)

    return (
        <Container className="divide-y p-0">
            <div className="px-6 py-4">
                <Heading level="h1">Comprobantes y Cotizaciones</Heading>
                <Text className="text-ui-fg-subtle mt-1">
                    Gestiona empresas emisoras y plantillas de documentos.
                </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {/* Empresas Card */}
                <div className="border border-ui-border-base rounded-lg p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <Heading level="h2">Empresas</Heading>
                        <Badge color={configs.length > 0 ? "blue" : "grey"}>
                            {configs.length}
                        </Badge>
                    </div>
                    {loadingConfigs ? (
                        <Text className="text-ui-fg-subtle text-sm">Cargando...</Text>
                    ) : defaultCompany ? (
                        <div className="bg-ui-bg-subtle rounded-md p-3">
                            <Text className="text-sm font-medium">{defaultCompany.company_name}</Text>
                            {defaultCompany.company_ruc && (
                                <Text className="text-ui-fg-subtle text-xs">RUC: {defaultCompany.company_ruc}</Text>
                            )}
                            <Badge color="green" className="mt-1">Default</Badge>
                        </div>
                    ) : (
                        <Text className="text-ui-fg-subtle text-sm">
                            No hay empresas configuradas.
                        </Text>
                    )}
                    <Button
                        variant="secondary"
                        className="mt-auto"
                        onClick={() => navigate("/invoice-config/companies")}
                    >
                        Gestionar Empresas
                    </Button>
                </div>

                {/* Plantillas Card */}
                <div className="border border-ui-border-base rounded-lg p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <Heading level="h2">Plantillas</Heading>
                        <Badge color={templates.length > 0 ? "blue" : "grey"}>
                            {templates.length}
                        </Badge>
                    </div>
                    {loadingTemplates ? (
                        <Text className="text-ui-fg-subtle text-sm">Cargando...</Text>
                    ) : templates.length > 0 ? (
                        <div className="bg-ui-bg-subtle rounded-md p-3 flex flex-col gap-1">
                            {templates.slice(0, 3).map((t) => (
                                <Text key={t.id} className="text-sm">
                                    {t.name}
                                </Text>
                            ))}
                            {templates.length > 3 && (
                                <Text className="text-ui-fg-subtle text-xs">
                                    +{templates.length - 3} más...
                                </Text>
                            )}
                        </div>
                    ) : (
                        <Text className="text-ui-fg-subtle text-sm">
                            No hay plantillas. Se crearán al reiniciar el servidor.
                        </Text>
                    )}
                    <Button
                        variant="secondary"
                        className="mt-auto"
                        onClick={() => navigate("/invoice-config/invoice-templates")}
                    >
                        Gestionar Plantillas
                    </Button>
                </div>
            </div>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Comprobantes y Cotizaciones",
})

export default InvoiceConfigPage