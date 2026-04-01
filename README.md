# @codemind.ec/medusa-plugin-invoice

Plugin de **facturación y cotización PDF** para Medusa v2 — genera facturas de pedido y proformas de cotización con plantillas HTML personalizables desde el admin.

[![Medusa v2](https://img.shields.io/badge/medusa-v2-blueviolet)](https://docs.medusajs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Multi-empresa** — registra múltiples empresas (InvoiceConfig) y asigna una por defecto. Cada plantilla puede vincularse a una empresa específica.
- **Generación de PDFs** — facturas de pedido y proformas de cotización vía pdfmake + Handlebars/Puppeteer.
- **Variables de empresa unificadas** — `company_name`, `company_ruc`, `company_address`, `company_phone`, `company_email` y `company_logo_base64` están disponibles en **todos** los tipos de plantilla gracias a `buildCompanyContext()` en la clase base.
- **Plantillas HTML editables** — CRUD completo de plantillas con preview en tiempo real, paleta de variables categorizada y selector de empresa.
- **Strategy Pattern** — cada tipo de documento (factura, proforma) tiene su propia estrategia extensible.
- **Templates embebidos** — plantillas por defecto incluidas en el código; restaurables con un clic.
- **Admin UI** — dashboard "Comprobantes y Cotizaciones" con gestión de empresas, editor de plantillas con CodeMirror, widget de descarga en pedidos.

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
// Importar los tipos para autocompletado del editor
import type { InvoiceModuleOptions } from "@codemind.ec/medusa-plugin-invoice"

// Opcional: Importar la estrategia por defecto de facturas
import { OrderInvoiceStrategy, ORDER_INVOICE_META } from "@codemind.ec/medusa-plugin-invoice"

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
      // Castear a InvoiceModuleOptions habilitará el autocompletado en tu IDE
      options: {
        strategies: [
          // Puedes registrar la estrategia de comprobante integrada aquí
          { id: "order_invoice", strategy: OrderInvoiceStrategy, meta: ORDER_INVOICE_META },
          // Y/o registrar las tuyas propias:
          // { id: "quote_proforma", strategy: MiPropiaEstrategia, meta: MI_PROPIA_META },
        ],
      } as InvoiceModuleOptions,
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
│   ├── admin/                                  # UI del admin (widgets + rutas)
│   │   ├── widgets/order-invoice.tsx           # Botón "Descargar comprobante" en pedidos
│   │   └── routes/invoice-config/
│   │       ├── page.tsx                        # Dashboard: Comprobantes y Cotizaciones
│   │       ├── companies/
│   │       │   ├── page.tsx                    # Lista de empresas
│   │       │   ├── new/page.tsx                # Crear empresa
│   │       │   └── [id]/page.tsx               # Editar empresa
│   │       └── invoice-templates/
│   │           ├── page.tsx                    # Lista de plantillas
│   │           └── [id]/page.tsx               # Editor de plantilla (CodeMirror + variables)
│   ├── api/admin/
│   │   ├── invoice-config/                     # CRUD multi-empresa
│   │   │   ├── route.ts                        # GET (listar) / POST (crear)
│   │   │   └── [id]/
│   │   │       ├── route.ts                    # GET / POST / DELETE por ID
│   │   │       └── set-default/route.ts        # POST marcar como default
│   │   └── invoice-templates/                  # CRUD de plantillas + preview + restore
│   └── modules/
│       └── invoice-generator/
│           ├── models/                         # Invoice, InvoiceConfig, InvoiceTemplate
│           ├── templates/
│           │   ├── strategy.ts                 # BaseDocumentStrategy + buildCompanyContext()
│           │   ├── order-invoice.ts            # Estrategia de factura de pedido
│           │   ├── quote-proforma.ts           # Estrategia de proforma de cotización
│           │   └── defaults/index.ts           # HTML embebido de plantillas por defecto
│           ├── loaders/                        # Seed de config y plantillas iniciales
│           ├── migrations/                     # Migraciones de base de datos
│           ├── service.ts                      # InvoiceGeneratorService
│           └── index.ts                        # INVOICE_MODULE export
└── index.d.ts                                  # Declaraciones de tipos
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

### Invoice Config (Multi-empresa)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/admin/invoice-config` | Listar todas las empresas |
| `POST` | `/admin/invoice-config` | Crear nueva empresa |
| `GET`  | `/admin/invoice-config/:id` | Obtener empresa por ID |
| `POST` | `/admin/invoice-config/:id` | Actualizar empresa |
| `DELETE` | `/admin/invoice-config/:id` | Eliminar empresa |
| `POST` | `/admin/invoice-config/:id/set-default` | Marcar empresa como predeterminada |

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
// Módulo, servicio y opciones de configuración
import { INVOICE_MODULE, InvoiceGeneratorService } from "@codemind.ec/medusa-plugin-invoice"
import type { InvoiceModuleOptions } from "@codemind.ec/medusa-plugin-invoice"

// Tipos de factura de pedido
import type { InvoiceOrder, InvoiceLineItem, InvoiceOrderAddress, OrderInvoiceInput } from "@codemind.ec/medusa-plugin-invoice"

// Enums
import { InvoiceStatus } from "@codemind.ec/medusa-plugin-invoice"
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
// mi-estrategia.ts
import { BaseDocumentStrategy, type StrategyRegistrationMeta } from "@codemind.ec/medusa-plugin-invoice"

export class MyCustomStrategy extends BaseDocumentStrategy<MyInput> {
  async buildDocumentDefinition(input, config, htmlTemplate?) {
    // buildCompanyContext() inyecta automáticamente las 6 variables de empresa
    const companyCtx = await this.buildCompanyContext(config)

    if (htmlTemplate) {
      return this.renderHtmlTemplate(htmlTemplate, { ...companyCtx, ...input })
    }
    // ... construir doc pdfmake programáticamente
  }
}

export const MY_CUSTOM_META: StrategyRegistrationMeta = {
  label: "Mi Documento Custom",
  // Opcional:
  // variableCategories: [ ... ]
  // buildSampleData: () => ({ ... })
}
```

Luego regístrala en `medusa-config.ts` dentro de `options.strategies`:

```typescript
// medusa-config.ts
import { MyCustomStrategy, MY_CUSTOM_META } from "./src/strategies/mi-estrategia.ts"

// ...
modules: [
  {
    resolve: "@codemind.ec/medusa-plugin-invoice/modules/invoice-generator",
    options: {
      strategies: [
        { id: "my_custom_doc", strategy: MyCustomStrategy, meta: MY_CUSTOM_META }
      ]
    } as InvoiceModuleOptions,
  }
]
```

### Variables de empresa disponibles en todas las plantillas

`buildCompanyContext(config)` retorna:

| Variable | Descripción |
|----------|-------------|
| `company_name` | Nombre de la empresa |
| `company_ruc` | RUC / NIT / identificador fiscal |
| `company_address` | Dirección de la empresa |
| `company_phone` | Teléfono |
| `company_email` | Email |
| `company_logo_base64` | Logo en base64 (data URI) |

### Resolución de empresa en plantillas

Cuando se genera un PDF, el servicio resuelve la empresa con esta prioridad:

1. `template.company_id` — si la plantilla tiene una empresa asignada.
2. `is_default = true` — la empresa marcada como predeterminada.
3. Primera empresa — fallback al primer registro.

---

## Changelog

### 1.3.1

- **Preview HTML unificado** — el preview del editor ahora reutiliza `renderHtmlToPdf()` del servicio en lugar de duplicar el flujo de Puppeteer.
- **Typings públicos mejorados** — `InvoiceGeneratorService` expone `renderHtmlToPdf()` y se documenta mejor la configuración extensible vía `InvoiceModuleOptions`.
- **Documentación actualizada** — ejemplos de registro de estrategias y uso del plugin alineados con la API pública actual.

### 1.2.0

- **Variables de empresa unificadas** — `buildCompanyContext()` en `BaseDocumentStrategy` garantiza que las 6 variables de empresa (`company_name`, `company_ruc`, `company_address`, `company_phone`, `company_email`, `company_logo_base64`) estén disponibles en **todos** los tipos de plantilla (factura y proforma).
- Paleta de variables categorizada en el editor ahora muestra las mismas variables de empresa para ambos tipos de documento.
- Datos de preview actualizados para proforma con campos de empresa completos.

### 1.1.0

- **Soporte multi-empresa** — múltiples configuraciones de empresa con `is_default`.
- **Asociación plantilla-empresa** — campo `company_id` en plantillas para vincular a una empresa específica.
- **API CRUD completa** — nuevos endpoints `GET/POST/DELETE /admin/invoice-config/:id` y `POST /admin/invoice-config/:id/set-default`.
- **Dashboard renovado** — página principal "Comprobantes y Cotizaciones" con tarjetas de navegación.
- **Gestión de empresas** — páginas de listado, creación y edición de empresas.
- **Editor de plantillas mejorado** — paleta de variables categorizada, selector de empresa, preview con logo placeholder.
- Migración automática para `is_default` y `company_id`.

### 1.0.0

- Release inicial: generación PDF, plantillas editables, configuración de empresa, strategy pattern.

---

## License

MIT — [CodeMind](https://codemind.ec)
