import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260601120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "invoice_template" ("id" text not null, "name" text not null, "slug" text not null, "html_content" text not null, "type" text check ("type" in ('order_invoice', 'quote_proforma')) not null, "is_default" boolean not null default false, "variables_schema" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoice_template_slug_unique" ON "invoice_template" ("slug") WHERE "deleted_at" IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_template_deleted_at" ON "invoice_template" ("deleted_at") WHERE "deleted_at" IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_template_type" ON "invoice_template" ("type");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "invoice_template" cascade;`);
  }

}
