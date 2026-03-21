# @codemind.ec/medusa-plugin-invoice

Plugin de **facturación y cotización PDF** para Medusa v2 — genera facturas de pedido y proformas de cotización con plantillas HTML personalizables desde el admin.

[![Medusa v2](https://img.shields.io/badge/medusa-v2-blueviolet)](https://docs.medusajs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Generación de PDFs** — facturas de pedido y proformas de cotización vía pdfmake + Handlebars.
- **Plantillas HTML editables** — CRUD completo de plantillas con preview en tiempo real desde el admin.
- **Configuración de empresa** — logo, RUC, dirección, teléfono, notas de pie de factura.
- **Strategy Pattern** — cada tipo de documento (factura, proforma) tiene su propia estrategia extensible.
- **Templates embebidos** — plantillas por defecto incluidas en el código; restaurables con un clic.
- **Admin UI** — widget de descarga en pedidos, editor de plantillas con CodeMirror, página de configuración.

---

## Requisitos

| Requisito | Versión  |
|-----------|----------|
| Node.js   | >= 20    |
| Medusa    | >= 2.13  |

---

## Instalación

```bash
pnpm add @codemind.ec/medusa-plugin-invoice
```

---

## Configuración

### 1. Registrar el plugin y módulo en `medusa-config.ts`

```typescript
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  // ...
  plugins: [
    {
      resolve: "@codemind.ec/medusa-plugin-invoice",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@codemind.ec/medusa-plugin-invoice/modules/invoice-generator",
      options: {},
    },
  ],
})
```

### 2. Variables de entorno (opcionales)

El loader del módulo puede leer estas variables para configurar los valores iniciales de la empresa al crear la base de datos por primera vez:

| Variable              | Descripción                        | Default        |
|-----------------------|------------------------------------|----------------|
| `STORE_NAME`          | Nombre de la empresa               | —              |
| `STORE_ADDRESS`       | Dirección de la empresa            | —              |
| `STORE_PHONE`         | Teléfono de la empresa             | —              |
| `ADMIN_EMAIL`         | Email de notificaciones admin      | —              |
| `MEDUSA_BACKEND_URL`  | URL base para embeber imágenes     | `http://localhost:9000` |

Todos los valores se pueden editar después desde el admin.

---

## Arquitectura

```
medusa-plugin-invoice/
├── src/
│   ├── admin/                          # UI del admin (widgets + rutas)
│   │   ├── widgets/order-invoice.tsx   # Botón "Descargar comprobante" en pedidos
│   │   └── routes/                     # Páginas de config y plantillas
│   ├── api/                            # Rutas REST del plugin
│   │   └── admin/
│   │       ├── invoice-config/         # GET/POST configuración de empresa
│   │       └── invoice-templates/      # CRUD de plantillas + preview + restore
│   └── modules/
│       └── invoice-generator/
│           ├── models/                 # Invoice, InvoiceConfig, InvoiceTemplate
│           ├── templates/
│           │   ├── strategy.ts         # BaseDocumentStrategy + TemplateFactory
│           │   ├── order-invoice.ts    # Estrategia de factura de pedido
│           │   ├── quote-proforma.ts   # Estrategia de proforma de cotización
│           │   └── defaults/index.ts   # HTML embebido de plantillas por defecto
│           ├── loaders/                # Seed de config y plantillas iniciales
│           ├── migrations/             # Migraciones de base de datos
│           ├── service.ts              # InvoiceGeneratorService
│           └── index.ts                # INVOICE_MODULE export
└── index.d.ts                          # Declaraciones de tipos
```

### Separación de responsabilidades

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| **Módulo** (modelos, servicio, migraciones, loader) | Plugin | Datos y lógica de dominio aislada |
| **API routes** | Plugin | Endpoints CRUD del módulo (config, plantillas) |
| **Admin UI** | Plugin | Widgets y páginas de administración |
| **Workflows / Steps** | App (`apps/medusa/`) | Orquestación cross-module |
| **Subscribers** | App (`apps/medusa/`) | Reacción a eventos del sistema |

> **¿Por qué los workflows NO están en el plugin?**
>
> Los workflows son **orquestación cross-module** por naturaleza. Por ejemplo, `generate-invoice-pdf` consulta el módulo `order` (via query graph), resuelve países del módulo `country`, verifica metadata de cotizaciones desde tipos de la app, y *luego* llama al módulo invoice. Moverlos al plugin crearía dependencias circulares (plugin → app) y eliminaría la capacidad de la app de personalizar la orquestación. Esta es la convención recomendada por Medusa v2: los plugins exponen módulos + API, las apps controlan la orquestación.

---

## API Routes

### Invoice Config

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/admin/invoice-config` | Obtener configuración actual |
| `POST` | `/admin/invoice-config` | Actualizar configuración |

### Invoice Templates

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`    | `/admin/invoice-templates`              | Listar plantillas |
| `POST`   | `/admin/invoice-templates`              | Crear plantilla |
| `GET`    | `/admin/invoice-templates/:id`          | Obtener plantilla |
| `POST`   | `/admin/invoice-templates/:id`          | Actualizar plantilla |
| `DELETE` | `/admin/invoice-templates/:id`          | Eliminar plantilla (no defaults) |
| `POST`   | `/admin/invoice-templates/:id/preview`  | Generar PDF de preview |
| `POST`   | `/admin/invoice-templates/:id/restore`  | Restaurar HTML por defecto |

---

## Uso desde la app

### Imports disponibles

```typescript
// Módulo y servicio
import { INVOICE_MODULE, InvoiceGeneratorService } from "@codemind.ec/medusa-plugin-invoice"

// Tipos de factura de pedido
import type { InvoiceOrder, InvoiceLineItem, InvoiceOrderAddress, OrderInvoiceInput } from "@codemind.ec/medusa-plugin-invoice"

// Tipos de proforma de cotización
import type { QuoteProformaInput, ProformaConfigField, QuoteCustomerInfo, QuoteScheduleRules } from "@codemind.ec/medusa-plugin-invoice"

// Enums
import { InvoiceStatus, TemplateType } from "@codemind.ec/medusa-plugin-invoice"
```

### Generar un PDF desde un workflow/step

```typescript
const invoiceService = container.resolve<InvoiceGeneratorService>(INVOICE_MODULE)

// Factura de pedido
const pdfBuffer = await invoiceService.generatePdf({
  template: "order_invoice",
  data: { order, items, invoiceDisplayId: 1, created_at: "2025-01-01" },
  invoice_id: "inv_01ABC...",
})

// Proforma de cotización
const pdfBuffer = await invoiceService.generatePdf({
  template: "quote_proforma",
  data: { serviceType: "Catering", /* ... */ },
})
```

---

## Extensibilidad

### Registrar una nueva estrategia de documento

```typescript
import { TemplateFactory, BaseDocumentStrategy } from "@codemind.ec/medusa-plugin-invoice"

class MyCustomStrategy extends BaseDocumentStrategy<MyInput> {
  async buildDocumentDefinition(input, config, htmlTemplate?) {
    if (htmlTemplate) return this.renderHtmlTemplate(htmlTemplate, input)
    // ... construir doc pdfmake programáticamente
  }
}

TemplateFactory.register("my_custom_doc", MyCustomStrategy)
```

---

## License

MIT — [CodeMind](https://codemind.ec)
