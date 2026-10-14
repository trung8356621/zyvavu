import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "page_permalink_structure" varchar DEFAULT '/%slug%';
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "category_permalink_structure" varchar DEFAULT '/category/%term%';
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "tag_permalink_structure" varchar DEFAULT '/tag/%term%';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "tag_permalink_structure";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "category_permalink_structure";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "page_permalink_structure";
  `)
}
