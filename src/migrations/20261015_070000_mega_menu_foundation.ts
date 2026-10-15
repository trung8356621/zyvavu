import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "enable_mega_menu" boolean DEFAULT false;
  ALTER TABLE "menus" ADD COLUMN IF NOT EXISTS "mode" varchar DEFAULT 'classic';
  ALTER TABLE "menus" ADD COLUMN IF NOT EXISTS "mega_layout" jsonb;
  ALTER TABLE "menus" ADD COLUMN IF NOT EXISTS "mobile_menu" jsonb;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "menus" DROP COLUMN IF EXISTS "mobile_menu";
  ALTER TABLE "menus" DROP COLUMN IF EXISTS "mega_layout";
  ALTER TABLE "menus" DROP COLUMN IF EXISTS "mode";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "enable_mega_menu";
  `)
}
