import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260331210000 extends Migration {
  override async up(): Promise<void> {
    // Drop the check constraint that restricted types to order_invoice and quote_proforma
    // MikroORM names the check constraint table_column_check by default
    this.addSql(`ALTER TABLE "invoice_template" DROP CONSTRAINT IF EXISTS "invoice_template_type_check";`)
  }

  override async down(): Promise<void> {
    // Re-add the check constraint
    this.addSql(`ALTER TABLE "invoice_template" ADD CONSTRAINT "invoice_template_type_check" CHECK ("type" IN ('order_invoice', 'quote_proforma'));`)
  }
}
