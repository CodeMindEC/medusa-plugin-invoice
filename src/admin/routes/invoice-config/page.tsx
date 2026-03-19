import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input, Label, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/sdk"
import { useForm } from "react-hook-form"
import { z } from "@medusajs/framework/zod"
import {
    FormProvider,
    Controller,
} from "react-hook-form"
import { useCallback, useEffect } from "react"

type InvoiceConfig = {
    id: string;
    company_name: string;
    company_ruc?: string;
    company_address: string;
    company_phone: string;
    company_email: string;
    company_logo?: string;
    notes?: string;
    admin_notification_email?: string;
}

const schema = z.object({
    company_name: z.string().optional(),
    company_ruc: z.string().optional(),
    company_address: z.string().optional(),
    company_phone: z.string().optional(),
    company_email: z.string().email().optional(),
    company_logo: z.string().url().optional(),
    notes: z.string().optional(),
    admin_notification_email: z.string().email().optional().or(z.literal("")),
})

const InvoiceConfigPage = () => {
    const { data, isLoading, refetch } = useQuery<{
        invoice_config: InvoiceConfig
    }>({
        queryFn: () => sdk.client.fetch("/admin/invoice-config"),
        queryKey: ["invoice-config"],
    })
    const { mutateAsync, isPending } = useMutation({
        mutationFn: (payload: z.infer<typeof schema>) =>
            sdk.client.fetch("/admin/invoice-config", {
                method: "POST",
                body: payload,
            }),
        onSuccess: () => {
            refetch()
            toast.success("Configuración actualizada exitosamente")
        },
    })

    const getFormDefaultValues = useCallback(() => {
        return {
            company_name: data?.invoice_config.company_name || "",
            company_ruc: data?.invoice_config.company_ruc || "",
            company_address: data?.invoice_config.company_address || "",
            company_phone: data?.invoice_config.company_phone || "",
            company_email: data?.invoice_config.company_email || "",
            company_logo: data?.invoice_config.company_logo || "",
            notes: data?.invoice_config.notes || "",
            admin_notification_email: data?.invoice_config.admin_notification_email || "",
        }
    }, [data])

    const form = useForm<z.infer<typeof schema>>({
        defaultValues: getFormDefaultValues(),
    })

    const handleSubmit = form.handleSubmit((formData) => mutateAsync(formData))

    const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        const { files } = await sdk.admin.upload.create({
            files: [file],
        })

        form.setValue("company_logo", files[0].url)
    }

    useEffect(() => {
        form.reset(getFormDefaultValues())
    }, [getFormDefaultValues])


    return (
        <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
                <Heading level="h1">Configuración de Comprobante</Heading>
            </div>
            <FormProvider {...form}>
                <form
                    onSubmit={handleSubmit}
                    className="flex h-full flex-col overflow-hidden p-2 gap-2"
                >
                    {/* Admin notification email — first and prominent */}
                    <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-3 mb-2">
                        <Controller
                            control={form.control}
                            name="admin_notification_email"
                            render={({ field }) => {
                                return (
                                    <div className="flex flex-col space-y-2">
                                        <div className="flex items-center gap-x-1">
                                            <Label size="small" weight="plus">
                                                📧 Email de Notificaciones (Admin)
                                            </Label>
                                        </div>
                                        <Input {...field} onChange={field.onChange} value={field.value} placeholder="admin@mariquita.food" />
                                        <span className="text-ui-fg-subtle text-xs">Se enviarán notificaciones de nuevos pedidos y comprobantes de pago a este email.</span>
                                    </div>
                                )
                            }}
                        />
                    </div>
                    <Controller
                        control={form.control}
                        name="company_name"
                        render={({ field }) => {
                            return (
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center gap-x-1">
                                        <Label size="small" weight="plus">
                                            Nombre de la Empresa
                                        </Label>
                                    </div>
                                    <Input {...field} onChange={field.onChange} value={field.value} />
                                </div>
                            )
                        }}
                    />
                    <Controller
                        control={form.control}
                        name="company_ruc"
                        render={({ field }) => {
                            return (
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center gap-x-1">
                                        <Label size="small" weight="plus">
                                            RUC
                                        </Label>
                                    </div>
                                    <Input {...field} onChange={field.onChange} value={field.value} placeholder="1234567890001" />
                                </div>
                            )
                        }}
                    />
                    <Controller
                        control={form.control}
                        name="company_address"
                        render={({ field }) => {
                            return (
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center gap-x-1">
                                        <Label size="small" weight="plus">
                                            Dirección de la Empresa
                                        </Label>
                                    </div>
                                    <Textarea {...field} />
                                </div>
                            )
                        }}
                    />
                    <Controller
                        control={form.control}
                        name="company_phone"
                        render={({ field }) => {
                            return (
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center gap-x-1">
                                        <Label size="small" weight="plus">
                                            Teléfono de la Empresa
                                        </Label>
                                    </div>
                                    <Input {...field} />
                                </div>
                            )
                        }}
                    />
                    <Controller
                        control={form.control}
                        name="company_email"
                        render={({ field }) => {
                            return (
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center gap-x-1">
                                        <Label size="small" weight="plus">
                                            Email de la Empresa
                                        </Label>
                                    </div>
                                    <Input {...field} />
                                </div>
                            )
                        }}
                    />
                    <Controller
                        control={form.control}
                        name="notes"
                        render={({ field }) => {
                            return (
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center gap-x-1">
                                        <Label size="small" weight="plus">
                                            Notas
                                        </Label>
                                    </div>
                                    <Textarea {...field} />
                                </div>
                            )
                        }}
                    />
                    <Controller
                        control={form.control}
                        name="company_logo"
                        render={({ field }) => {
                            return (
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center gap-x-1">
                                        <Label size="small" weight="plus">
                                            Logo de la Empresa
                                        </Label>
                                    </div>
                                    <Input type="file" onChange={uploadLogo} className="py-1" />
                                    {field.value && (
                                        <img
                                            src={field.value}
                                            alt="Logo de la Empresa"
                                            className="mt-2 h-24 w-24"
                                        />
                                    )}
                                </div>
                            )
                        }}
                    />
                    <Button type="submit" disabled={isLoading || isPending}>
                        Guardar
                    </Button>
                </form>
            </FormProvider>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Comprobante de Pedido",
})

export default InvoiceConfigPage