import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { sdk } from "../lib/sdk"
import { useState } from "react"

const OrderInvoiceWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
    const [isDownloading, setIsDownloading] = useState(false)

    const downloadInvoice = async () => {
        setIsDownloading(true)

        try {
            const response: Response = await sdk.client.fetch(`/admin/orders/${order.id}/invoices`, {
                method: "GET",
                headers: {
                    "accept": "application/pdf",
                },
            })

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `comprobante-pedido-${order.id}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            setIsDownloading(false)
            toast.success("Comprobante generado y descargado exitosamente")
        } catch (error) {
            toast.error(`Error al generar comprobante: ${error}`)
            setIsDownloading(false)
        }
    }

    return (
        <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
                <div>
                    <Heading level="h2">Comprobante</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                        Generar y descargar comprobante de pedido
                    </Text>
                </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4">
                <Button
                    variant="secondary"
                    disabled={isDownloading}
                    onClick={downloadInvoice}
                    isLoading={isDownloading}
                >
                    Descargar Comprobante
                </Button>
            </div>
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: "order.details.side.before",
})

export default OrderInvoiceWidget