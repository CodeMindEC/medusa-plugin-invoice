# @codemind.ec/medusa-plugin-invoice

Invoice & quotation **PDF widget** for the Medusa v2 admin dashboard — download order receipts and manage company billing configuration.

[![npm version](https://img.shields.io/npm/v/@codemind.ec/medusa-plugin-invoice.svg)](https://www.npmjs.com/package/@codemind.ec/medusa-plugin-invoice)
[![Medusa v2](https://img.shields.io/badge/medusa-v2-blueviolet)](https://docs.medusajs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Order invoice widget** — "Download Receipt" button injected into the order detail sidebar in the Medusa admin.
- **PDF generation** — fetches and downloads invoices as PDF files (`comprobante-pedido-{orderId}.pdf`).
- **Invoice config page** — admin route for managing billing/invoicing settings.
- **Medusa SDK integration** — uses the official `@medusajs/js-sdk` for authenticated API calls.

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | >= 20   |
| Medusa      | >= 2.4.0 |

---

## Installation

```bash
npm install @codemind.ec/medusa-plugin-invoice
# or
pnpm add @codemind.ec/medusa-plugin-invoice
```

---

## Configuration

Add the plugin to your `medusa-config.ts`:

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
})
```

No environment variables are required. The admin widget uses `VITE_BACKEND_URL` if set, otherwise defaults to `"/"`.

---

## Admin UI

### Order Invoice Widget

**Zone:** `order.details.side.before`

When viewing an order in the Medusa admin, a widget appears in the sidebar with a **"Descargar Comprobante"** (Download Receipt) button. Clicking it:

1. Calls `GET /admin/orders/{orderId}/invoices`
2. Downloads the response as a PDF file
3. Filename: `comprobante-pedido-{orderId}.pdf`

### Invoice Configuration Page

**Route:** `/invoice-config`

A dedicated admin page for managing company billing and invoicing settings.

---

## Architecture

This is an **admin-only** plugin — it does not register backend modules, API routes, or database models. It provides:

| Component | Location | Purpose |
|-----------|----------|---------|
| Order widget | `widgets/order-invoice.tsx` | PDF download button in order sidebar |
| Config page | `routes/invoice-config/page.tsx` | Billing configuration UI |
| SDK client | `lib/sdk.ts` | Authenticated Medusa client for API calls |

The PDF generation endpoint (`/admin/orders/:id/invoices`) should be provided by your Medusa backend (e.g., via a custom API route or another plugin).

---

## SDK Configuration

The built-in SDK client is pre-configured for the admin:

```typescript
import Medusa from "@medusajs/js-sdk"

const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})
```

---

## License

MIT — [CodeMind](https://codemind.ec)
