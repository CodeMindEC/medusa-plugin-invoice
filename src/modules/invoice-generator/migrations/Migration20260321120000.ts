import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260321120000 extends Migration {

    override async up(): Promise<void> {
        // Add is_default to invoice_config
        this.addSql(`ALTER TABLE IF EXISTS "invoice_config" ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;`);

        // Set the first existing config as default
        this.addSql(`
      UPDATE "invoice_config"
      SET "is_default" = true
      WHERE "id" = (
        SELECT "id" FROM "invoice_config"
        WHERE "deleted_at" IS NULL
        ORDER BY "created_at" ASC
        LIMIT 1
      );
    `);

        // Add company_id to invoice_template
        this.addSql(`ALTER TABLE IF EXISTS "invoice_template" ADD COLUMN IF NOT EXISTS "company_id" text NULL;`);
    }

    override async down(): Promise<void> {
        this.addSql(`ALTER TABLE IF EXISTS "invoice_config" DROP COLUMN IF EXISTS "is_default";`);
        this.addSql(`ALTER TABLE IF EXISTS "invoice_template" DROP COLUMN IF EXISTS "company_id";`);
    }

}
