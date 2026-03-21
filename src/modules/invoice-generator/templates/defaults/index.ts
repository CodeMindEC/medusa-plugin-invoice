/**
 * Default HTML templates embedded as TypeScript string constants.
 *
 * This approach guarantees templates are always available at runtime regardless
 * of how the plugin is built or deployed (no filesystem reads, no copy scripts).
 *
 * For development, the raw `.html` files live alongside this module for
 * syntax-highlighted editing.  After making changes there, paste the updated
 * HTML into the corresponding constant below and keep both in sync.
 */

export interface DefaultTemplate {
  name: string
  slug: string
  type: string
  html: string
}

// ── Order Invoice ─────────────────────────────────────────────────────────────

export const ORDER_INVOICE_DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #495057; font-size: 10pt; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .company-name { font-size: 22pt; font-weight: bold; color: #1a365d; }
  .invoice-title { font-size: 24pt; font-weight: bold; color: #2c3e50; text-align: right; }
  .section-header { font-size: 12pt; font-weight: bold; color: #2c3e50; margin-bottom: 8px; }
  .company-address { font-size: 11pt; color: #4a5568; line-height: 1.3; }
  .company-contact { font-size: 10pt; color: #4a5568; }
  .label { font-size: 10pt; color: #6c757d; }
  .value { font-size: 10pt; font-weight: bold; color: #2c3e50; }
  .address-text { font-size: 10pt; color: #495057; line-height: 1.3; }

  table.items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  table.items-table th { background-color: #495057; color: #ffffff; font-size: 10pt; font-weight: bold; padding: 6px 8px; text-align: left; }
  table.items-table td { font-size: 9pt; color: #495057; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  table.items-table tr:nth-child(even) td { background-color: #f8f9fa; }

  table.totals-table { margin-left: auto; border-collapse: collapse; }
  table.totals-table td { padding: 6px 8px; }
  .total-label { font-size: 10pt; font-weight: bold; color: #495057; }
  .total-value { font-size: 10pt; font-weight: bold; color: #2c3e50; text-align: right; }

  table.meta-table { border-collapse: collapse; }
  table.meta-table td { padding: 2px 6px; }

  .columns { display: flex; gap: 20px; margin-bottom: 16px; }
  .columns > div { flex: 1; }

  .warning-header { font-size: 10pt; font-weight: bold; color: #d97706; margin-top: 20px; margin-bottom: 4px; }
  .warning-text { font-size: 10pt; color: #d97706; line-height: 1.4; margin-bottom: 20px; }
  .notes-header { font-size: 12pt; font-weight: bold; color: #2c3e50; margin-top: 20px; margin-bottom: 10px; }
  .notes-text { font-size: 10pt; color: #6c757d; font-style: italic; line-height: 1.4; margin-bottom: 20px; }
  .thank-you { font-size: 12pt; color: #28a745; font-style: italic; text-align: center; margin-top: 30px; }
  .disclaimer { font-size: 8pt; color: #6c757d; font-style: italic; text-align: center; margin-top: 10px; }
</style>
</head>
<body>

<!-- ── Header ──────────────────────────────────────────────────────────────── -->
<div class="header">
  <div>
    {{#if company_logo_base64}}
    <img src="{{company_logo_base64}}" style="width:80px; height:40px; object-fit:contain; margin-bottom:10px;" />
    {{/if}}
    <div class="company-name">{{company_name}}</div>
  </div>
  <div>
    <div class="invoice-title">COMPROBANTE DE PEDIDO</div>
  </div>
</div>

<!-- ── Company + Invoice Meta ──────────────────────────────────────────────── -->
<div class="columns">
  <div>
    <div class="section-header">DATOS DE LA EMPRESA</div>
    {{#if company_ruc}}<div class="company-contact" style="margin-bottom:4px;">RUC: {{company_ruc}}</div>{{/if}}
    {{#if company_address}}<div class="company-address" style="margin-bottom:4px;">{{company_address}}</div>{{/if}}
    {{#if company_phone}}<div class="company-contact" style="margin-bottom:4px;">{{company_phone}}</div>{{/if}}
    {{#if company_email}}<div class="company-contact">{{company_email}}</div>{{/if}}
  </div>
  <div>
    <table class="meta-table">
      <tr><td class="label">Comprobante N°:</td><td class="value">{{invoice_id}}</td></tr>
      <tr><td class="label">Fecha:</td><td class="value">{{invoice_date}}</td></tr>
      <tr><td class="label">Pedido N°:</td><td class="value">{{order_display_id}}</td></tr>
      <tr><td class="label">Fecha Pedido:</td><td class="value">{{order_date}}</td></tr>
    </table>
  </div>
</div>

<!-- ── Client + Shipping ───────────────────────────────────────────────────── -->
<div class="columns">
  <div>
    <div class="section-header">CLIENTE</div>
    <div class="address-text">{{billing_address}}</div>
    {{#if cedula}}<div class="address-text" style="margin-top:4px;">Cédula/RUC: {{cedula}}</div>{{/if}}
  </div>
  <div>
    <div class="section-header">ENVÍO A</div>
    <div class="address-text">{{shipping_address}}</div>
  </div>
</div>

<!-- ── Items Table ─────────────────────────────────────────────────────────── -->
<table class="items-table">
  <thead>
    <tr>
      <th>Artículo</th>
      <th>Cantidad</th>
      <th>Precio Unitario</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td>
        <strong>{{this.title}}</strong>
        {{#if this.variant_title}}<br/><span style="color:#6b7280; font-size:8pt;">{{this.variant_title}}</span>{{/if}}
      </td>
      <td>{{this.quantity}}</td>
      <td>{{this.unit_price}}</td>
      <td>{{this.total}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>

<!-- ── Totals ──────────────────────────────────────────────────────────────── -->
<table class="totals-table">
  <tr><td class="total-label">Subtotal:</td><td class="total-value">{{subtotal}}</td></tr>
  <tr><td class="total-label">Impuestos:</td><td class="total-value">{{tax_total}}</td></tr>
  {{#unless is_home_delivery}}
    {{#if shipping_total}}<tr><td class="total-label">Envío:</td><td class="total-value">{{shipping_total}}</td></tr>{{/if}}
  {{/unless}}
  {{#if discount_total}}<tr><td class="total-label">Descuento:</td><td class="total-value">{{discount_total}}</td></tr>{{/if}}
  <tr><td class="total-label">Total:</td><td class="total-value">{{total}}</td></tr>
</table>

<!-- ── Transport Warning ───────────────────────────────────────────────────── -->
{{#if is_home_delivery}}
<div class="warning-header">AVISO SOBRE TRANSPORTE</div>
<div class="warning-text">El valor de transporte no está incluido en este comprobante y deberá cotizarse aparte directamente con el vendedor.</div>
{{/if}}

<!-- ── Notes ───────────────────────────────────────────────────────────────── -->
{{#if notes}}
<div class="notes-header">Notas</div>
<div class="notes-text">{{notes}}</div>
{{/if}}

<!-- ── Footer ──────────────────────────────────────────────────────────────── -->
<div class="thank-you">¡Gracias por tu compra!</div>
<div class="disclaimer">Este documento es un comprobante de pedido, no constituye factura fiscal.</div>

</body>
</html>`

// ── Quote Proforma ────────────────────────────────────────────────────────────
// NOTE: The dollar sign before {{totals.total_formatted}} is escaped as \$
// to prevent JavaScript template literal interpolation.

export const QUOTE_PROFORMA_DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #282828; font-size: 9.5pt; }

  /* ── Design Tokens ─────────────────────────────────────────────── */
  .bg-dark     { background-color: #121212; }
  .bg-section  { background-color: #262626; }
  .bg-gold-light { background-color: #f5ebb4; }
  .text-gold   { color: #d4af37; }
  .text-white  { color: #ffffff; }
  .text-gray3  { color: #c8c8c8; }
  .text-gray5  { color: #8c8c8c; }
  .text-gray8  { color: #282828; }
  .text-warn   { color: #c0392b; }
  .text-success { color: #27ae60; }

  /* ── Header ────────────────────────────────────────────────────── */
  .header-bar { background-color: #121212; padding: 20px 40px; border-bottom: 3px solid #d4af37; }
  .header-bar table { width: 100%; }
  .brand-name { font-size: 24pt; font-weight: bold; color: #d4af37; }
  .brand-subtitle { font-size: 9pt; color: #c8c8c8; margin-top: 2px; }
  .header-meta { text-align: right; }
  .header-label { font-size: 9pt; font-weight: bold; color: #8c8c8c; }
  .header-value { font-size: 9pt; color: #c8c8c8; line-height: 1.35; }

  /* ── Footer ────────────────────────────────────────────────────── */
  .footer-bar { background-color: #121212; border-top: 2px solid #d4af37; padding: 12px 40px; text-align: center; margin-top: 30px; }
  .footer-thanks { font-size: 8pt; color: #c8c8c8; }
  .footer-legal { font-size: 7pt; color: #8c8c8c; margin-top: 5px; }
  .footer-site { font-size: 8pt; font-weight: bold; color: #d4af37; margin-top: 5px; }

  /* ── Section title ─────────────────────────────────────────────── */
  .section-title { background-color: #262626; color: #d4af37; font-size: 10pt; font-weight: bold; padding: 8px 12px; border-left: 3px solid #d4af37; margin-bottom: 10px; margin-top: 20px; }

  /* ── Service banner ────────────────────────────────────────────── */
  .service-banner { background-color: #f5ebb4; padding: 10px 18px; border-left: 3px solid #d4af37; margin: 12px 0 24px 0; }
  .service-label { font-size: 7pt; font-weight: bold; color: #8c8c8c; }
  .service-name { font-size: 15pt; font-weight: bold; color: #282828; margin-top: 4px; }

  /* ── Tables ────────────────────────────────────────────────────── */
  table.data-table { width: 100%; border-collapse: collapse; border-left: 2px solid #a0821e; }
  table.data-table td { padding: 6px 10px; font-size: 9.5pt; }
  table.data-table tr:nth-child(even) td { background-color: #f2f2f2; }
  table.data-table tr:nth-child(odd) td { background-color: #ffffff; }
  table.data-table .td-label { color: #8c8c8c; width: 42%; }
  table.data-table .td-value { color: #282828; font-weight: bold; text-align: right; }

  table.breakdown-table { width: 100%; border-collapse: collapse; border-left: 2px solid #d4af37; }
  table.breakdown-table td { padding: 6px 10px; font-size: 9.5pt; }
  table.breakdown-table tr:nth-child(even) td { background-color: #f2f2f2; }
  table.breakdown-table tr:nth-child(odd) td { background-color: #ffffff; }

  /* ── Summary / Total ───────────────────────────────────────────── */
  table.summary-table { width: 100%; border-collapse: collapse; }
  table.summary-table td { padding: 5px 8px; }
  .summary-label { font-size: 9.5pt; color: #8c8c8c; }
  .summary-value { font-size: 10pt; font-weight: bold; color: #282828; text-align: right; }

  .total-box { background-color: #1c1c1c; padding: 10px 16px; border-left: 4px solid #d4af37; margin-top: 6px; }
  .total-box table { width: 100%; }
  .total-heading { font-size: 9pt; font-weight: bold; color: #c8c8c8; }
  .total-subheading { font-size: 7pt; color: #8c8c8c; margin-top: 2px; }
  .total-amount { font-size: 28pt; font-weight: bold; color: #d4af37; text-align: right; }

  /* ── Transport warning ─────────────────────────────────────────── */
  .transport-warning { background-color: #fff7e6; padding: 10px 18px; border-left: 3px solid #d4af37; margin-bottom: 24px; }
  .transport-title { font-size: 8pt; font-weight: bold; color: #c0392b; }
  .transport-text { font-size: 9pt; color: #282828; line-height: 1.3; margin-top: 4px; }

  /* ── Includes ──────────────────────────────────────────────────── */
  .include-item { margin-bottom: 7px; font-size: 8.5pt; color: #282828; }
  .check-icon { color: #27ae60; font-weight: bold; margin-right: 4px; }
</style>
</head>
<body>

<!-- ── Header ──────────────────────────────────────────────────── -->
<div class="header-bar">
  <table>
    <tr>
      <td style="vertical-align:top;">
        <div class="brand-name">{{company_name}}</div>
        <div class="brand-subtitle">Contacto Empresarial</div>
      </td>
      <td class="header-meta" style="vertical-align:top; width:190px;">
        <div class="header-label">COTIZACIÓN</div>
        <hr style="width:28px; border:none; border-top:1.5px solid #d4af37; margin:6px 0 8px auto;" />
        <div class="header-value">Nro. de Proforma: {{quote_number}}</div>
        <div class="header-value">Fecha: {{date_str}}</div>
        <div class="header-value">Válida por 15 días</div>
      </td>
    </tr>
  </table>
</div>

<!-- ── Service Banner ──────────────────────────────────────────── -->
<div class="service-banner">
  <div class="service-label">TIPO DE SERVICIO</div>
  <div class="service-name">{{service_name}}</div>
</div>

<!-- ── Configuration Details ───────────────────────────────────── -->
{{#if config_fields.length}}
<div class="section-title">DETALLES DE LA CONFIGURACIÓN</div>
<table class="data-table">
  {{#each config_fields}}
  <tr>
    <td class="td-label">{{this.label}}</td>
    <td class="td-value">{{this.value}}</td>
  </tr>
  {{/each}}
</table>
{{/if}}

<!-- ── Price Breakdown ─────────────────────────────────────────── -->
{{#if breakdown.length}}
<div class="section-title">DESGLOSE DE COSTOS</div>
<table class="breakdown-table">
  {{#each breakdown}}
  <tr>
    <td style="color:#282828;">{{this.label}}</td>
    <td style="color:#282828; font-weight:bold; text-align:right;">{{this.total_formatted}}</td>
  </tr>
  {{/each}}
</table>
{{/if}}

<!-- ── Cost Summary ────────────────────────────────────────────── -->
<div class="section-title">RESUMEN DE COSTOS</div>
<table class="summary-table">
  <tr style="background-color:#f2f2f2;"><td class="summary-label">Subtotal de servicio</td><td class="summary-value">{{totals.subtotal_formatted}}</td></tr>
  <tr><td class="summary-label">Total extras</td><td class="summary-value">{{totals.extras_formatted}}</td></tr>
  {{#if totals.discount}}<tr style="background-color:#f2f2f2;"><td class="summary-label">Descuento</td><td class="summary-value">-{{totals.discount_formatted}}</td></tr>{{/if}}
  {{#unless is_home_delivery}}
    {{#if totals.shipping}}<tr><td class="summary-label">Costo de envío (Delivery)</td><td class="summary-value">{{totals.shipping_formatted}}</td></tr>{{/if}}
  {{/unless}}
  <tr style="background-color:#f2f2f2;">
    <td class="summary-label">Impuestos (IVA)</td>
    <td class="summary-value">{{#if totals.taxes_provided}}{{totals.taxes_formatted}}{{else}}<em style="color:#c0392b; font-size:8.5pt;">Cálculo pendiente al confirmar la reserva.</em>{{/if}}</td>
  </tr>
</table>

<!-- ── Grand Total ─────────────────────────────────────────────── -->
<div class="total-box">
  <table>
    <tr>
      <td style="vertical-align:middle;">
        <div class="total-heading">TOTAL A PAGAR</div>
        <div class="total-subheading">DÓLARES AMERICANOS</div>
      </td>
      <td class="total-amount">\${{totals.total_formatted}}</td>
    </tr>
  </table>
</div>
{{#unless totals.taxes_provided}}
<div style="text-align:right; margin-top:6px; font-size:9pt; font-weight:bold; color:#c0392b;">Total referencial: el valor final se confirmará una vez aplicado el cálculo de impuestos.</div>
{{/unless}}

<!-- ── Transport Warning ───────────────────────────────────────── -->
{{#if is_home_delivery}}
<div class="transport-warning" style="margin-top:24px;">
  <div class="transport-title">AVISO SOBRE TRANSPORTE</div>
  <div class="transport-text">El valor de transporte no está incluido en esta proforma y deberá cotizarse aparte directamente con el vendedor.</div>
</div>
{{/if}}

<!-- ── Includes ────────────────────────────────────────────────── -->
{{#if includes.length}}
<div class="section-title">¿QUÉ INCLUYE?</div>
<div style="display:flex; gap:24px;">
  <div style="flex:1;">
    {{#each includes_left}}
    <div class="include-item"><span class="check-icon">✓</span> {{this}}</div>
    {{/each}}
  </div>
  <div style="flex:1;">
    {{#each includes_right}}
    <div class="include-item"><span class="check-icon">✓</span> {{this}}</div>
    {{/each}}
  </div>
</div>
{{/if}}

<!-- ── Client Info ─────────────────────────────────────────────── -->
{{#if contact_rows.length}}
<div class="section-title">INFORMACIÓN DEL CLIENTE</div>
<table class="data-table">
  {{#each contact_rows}}
  <tr>
    <td class="td-label" style="width:36%;">{{this.label}}</td>
    <td class="td-value" style="text-align:left;">{{this.value}}</td>
  </tr>
  {{/each}}
</table>
{{/if}}

<!-- ── Footer ──────────────────────────────────────────────────── -->
<div class="footer-bar">
  <div class="footer-thanks">Gracias por tu confianza. Nuestro equipo ha recibido tu solicitud y se pondrá en contacto contigo a la brevedad.</div>
  <div class="footer-legal">Esta cotización es informativa y no constituye un contrato. Los precios pueden variar.</div>
  {{#if company_website}}<div class="footer-site">{{company_website}}</div>{{/if}}
</div>

</body>
</html>`

// ── Registry ──────────────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Comprobante de Pedido",
    slug: "order_invoice",
    type: "order_invoice",
    html: ORDER_INVOICE_DEFAULT_HTML,
  },
  {
    name: "Cotización Proforma",
    slug: "quote_proforma",
    type: "quote_proforma",
    html: QUOTE_PROFORMA_DEFAULT_HTML,
  },
]
