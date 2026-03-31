/**
 * Default HTML templates embedded as TypeScript string constants.
 *
 * These templates are co-located here for easy editing and are imported
 * by the strategy files that need them.
 *
 * After this refactor, each strategy's META holds a reference to its
 * default HTML. The old DEFAULT_TEMPLATES array and seeding is replaced
 * by dynamic seeding based on registered strategies.
 */

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

