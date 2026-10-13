import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "setup_complete" boolean DEFAULT false;

  UPDATE "settings"
  SET "site_url" = 'https://zyvavu.test'
  WHERE "site_url" IN ('http://zyvavu.test', 'http://zyvavu.test/', 'https://zyvavu.test/');
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "settings"
  SET "site_url" = 'http://zyvavu.test'
  WHERE "site_url" = 'https://zyvavu.test';

  ALTER TABLE "settings" DROP COLUMN IF EXISTS "setup_complete";
  `)
}
