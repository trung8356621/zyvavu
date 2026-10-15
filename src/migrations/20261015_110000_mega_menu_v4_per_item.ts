import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "menus" ADD COLUMN IF NOT EXISTS "default_dropdown_effect" varchar DEFAULT 'fade';
  ALTER TABLE "menus" ADD COLUMN IF NOT EXISTS "mega_layouts" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "menus_items" ADD COLUMN IF NOT EXISTS "parent_id" varchar;
  ALTER TABLE "menus_items" ADD COLUMN IF NOT EXISTS "has_submenu" boolean DEFAULT false;
  ALTER TABLE "menus_items" ADD COLUMN IF NOT EXISTS "submenu_type" varchar DEFAULT 'classic';
  ALTER TABLE "menus_items" ADD COLUMN IF NOT EXISTS "dropdown_effect" varchar DEFAULT 'inherit';
  ALTER TABLE "menus_items" ADD COLUMN IF NOT EXISTS "trigger_only" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "menus_items" DROP COLUMN IF EXISTS "trigger_only";
  ALTER TABLE "menus_items" DROP COLUMN IF EXISTS "dropdown_effect";
  ALTER TABLE "menus_items" DROP COLUMN IF EXISTS "submenu_type";
  ALTER TABLE "menus_items" DROP COLUMN IF EXISTS "has_submenu";
  ALTER TABLE "menus_items" DROP COLUMN IF EXISTS "parent_id";
  ALTER TABLE "menus" DROP COLUMN IF EXISTS "mega_layouts";
  ALTER TABLE "menus" DROP COLUMN IF EXISTS "default_dropdown_effect";
  `)
}
