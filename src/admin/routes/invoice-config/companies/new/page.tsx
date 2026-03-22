import { Container, Heading, Button, Input, Label, Textarea, Switch, toast, Text } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { sdk } from "../../../../lib/sdk"
import { useNavigate } from "react-router-dom"
import { useForm, Controller, FormProvider } from "react-hook-form"

type FormData = {
    company_name: string
    company_ruc: string
    company_address: string
    company_phone: string
    company_email: string
    company_logo: string
    notes: string
    admin_notification_email: string
    is_default: boolean
}

const NewCompanyPage = () => {
    const navigate = useNavigate()

    const form = useForm<FormData>({
        defaultValues: {
            company_name: "",
            company_ruc: "",
            company_address: "",
            company_phone: "",
            company_email: "",
            company_logo: "",
            notes: "",
            admin_notification_email: "",
            is_default: false,
        },
    })

    const createMutation = useMutation({
        mutationFn: (payload: FormData) =>
            sdk.client.fetch("/admin/invoice-config", {
                method: "POST",
                body: payload,
            }),
        onSuccess: () => {
            toast.success("Empresa creada exitosamente")
            navigate("/invoice-config/companies")
        },
        onError: () => toast.error("Error al crear la empresa"),
    })

    const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        try {
            const { files } = await sdk.admin.upload.create({ files: [file] })
            form.setValue("company_logo", files[0].url)
        } catch {
            toast.error("Error al subir el logo.")
        }
    }

    const handleSubmit = form.handleSubmit((data) => createMutation.mutate(data))

    return (
        <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
                <Heading level="h1">Nueva Empresa</Heading>
                <Button variant="secondary" onClick={() => navigate("/invoice-config/companies")}>
                    ← Volver
                </Button>
            </div>
            <FormProvider {...form}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 max-w-2xl">
                    <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-4 mb-2">
                        <Controller
                            control={form.control}
                            name="admin_notification_email"
                            render={({ field }) => (
                                <div className="flex flex-col gap-2">
                                    <Label size="small" weight="plus">📧 Email de Notificaciones (Admin)</Label>
                                    <Input {...field} placeholder="admin@empresa.com" />
                                    <Text className="text-ui-fg-subtle text-xs">
                                        Notificaciones de nuevos pedidos a este email.
                                    </Text>
                                </div>
                            )}
                        />
                    </div>

                    <Controller
                        control={form.control}
                        name="company_name"
                        render={({ field }) => (
                            <div className="flex flex-col gap-2">
                                <Label size="small" weight="plus">Nombre de la Empresa *</Label>
                                <Input {...field} placeholder="Mi Empresa S.A.S." />
                            </div>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="company_ruc"
                        render={({ field }) => (
                            <div className="flex flex-col gap-2">
                                <Label size="small" weight="plus">RUC</Label>
                                <Input {...field} placeholder="1234567890001" />
                            </div>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="company_address"
                        render={({ field }) => (
                            <div className="flex flex-col gap-2">
                                <Label size="small" weight="plus">Dirección</Label>
                                <Textarea {...field} placeholder="Av. Principal 123, Quito" />
                            </div>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Controller
                            control={form.control}
                            name="company_phone"
                            render={({ field }) => (
                                <div className="flex flex-col gap-2">
                                    <Label size="small" weight="plus">Teléfono</Label>
                                    <Input {...field} placeholder="+593 99 123 4567" />
                                </div>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="company_email"
                            render={({ field }) => (
                                <div className="flex flex-col gap-2">
                                    <Label size="small" weight="plus">Email de la Empresa</Label>
                                    <Input {...field} placeholder="info@empresa.com" />
                                </div>
                            )}
                        />
                    </div>

                    <Controller
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <div className="flex flex-col gap-2">
                                <Label size="small" weight="plus">Notas</Label>
                                <Textarea {...field} placeholder="Notas internas o pie de página del documento" />
                            </div>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="company_logo"
                        render={({ field }) => (
                            <div className="flex flex-col gap-2">
                                <Label size="small" weight="plus">Logo de la Empresa</Label>
                                <Input type="file" onChange={uploadLogo} className="py-1" />
                                {field.value && (
                                    <img src={field.value} alt="Logo" className="mt-2 h-24 w-24 object-contain" />
                                )}
                            </div>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="is_default"
                        render={({ field }) => (
                            <div className="flex items-center gap-3 bg-ui-bg-subtle rounded-lg p-3">
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                                <div>
                                    <Label size="small" weight="plus">Empresa por defecto</Label>
                                    <Text className="text-ui-fg-subtle text-xs">
                                        Se usará en plantillas que no tengan empresa asignada.
                                    </Text>
                                </div>
                            </div>
                        )}
                    />

                    <div className="flex gap-2 pt-2">
                        <Button variant="secondary" onClick={() => navigate("/invoice-config/companies")}>
                            Cancelar
                        </Button>
                        <Button type="submit" isLoading={createMutation.isPending}>
                            Crear Empresa
                        </Button>
                    </div>
                </form>
            </FormProvider>
        </Container>
    )
}

export default NewCompanyPage
