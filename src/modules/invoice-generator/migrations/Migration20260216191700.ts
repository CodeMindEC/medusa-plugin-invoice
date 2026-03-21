import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260216191700 extends Migration {

    override async up(): Promise<void> {
        this.addSql(`alter table if exists "invoice_config" add column if not exists "admin_notification_email" text;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table if exists "invoice_config" drop column if exists "admin_notification_email";`);
    }

}
