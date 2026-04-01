import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260602000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "invoice_template" ADD COLUMN IF NOT EXISTS "company_id" text NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "invoice_template" DROP COLUMN IF EXISTS "company_id";`);
  }
}
