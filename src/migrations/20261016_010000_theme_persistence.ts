import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "active_theme_id" varchar DEFAULT 'corporate';
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "theme_templates" jsonb;
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "theme_styles" jsonb;
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "theme_custom_presets" jsonb;
  UPDATE "settings" SET "active_theme_id" = 'corporate' WHERE "active_theme_id" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "theme_custom_presets";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "theme_styles";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "theme_templates";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "active_theme_id";
  `)
}
