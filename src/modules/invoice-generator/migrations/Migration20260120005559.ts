import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260120005559 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "invoice_config" add column if not exists "company_ruc" text;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "invoice_config" drop column if exists "company_ruc";`);
  }

}
