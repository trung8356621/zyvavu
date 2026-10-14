import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logo_id" integer;
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "favicon_id" integer;
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "timezone" varchar DEFAULT 'Asia/Ho_Chi_Minh';
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "date_format" varchar DEFAULT 'dd/MM/yyyy';
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "time_format" varchar DEFAULT 'HH:mm';
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "week_starts_on" varchar DEFAULT 'monday';
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "post_permalink_structure" varchar DEFAULT 'posts';
  ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "secondary_language" varchar DEFAULT 'en';

  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'settings_logo_id_media_id_fk'
    ) THEN
      ALTER TABLE "settings" ADD CONSTRAINT "settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    END IF;
  END $$;

  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'settings_favicon_id_media_id_fk'
    ) THEN
      ALTER TABLE "settings" ADD CONSTRAINT "settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS "settings_logo_idx" ON "settings" USING btree ("logo_id");
  CREATE INDEX IF NOT EXISTS "settings_favicon_idx" ON "settings" USING btree ("favicon_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_favicon_id_media_id_fk";
  ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_logo_id_media_id_fk";

  DROP INDEX IF EXISTS "settings_favicon_idx";
  DROP INDEX IF EXISTS "settings_logo_idx";

  ALTER TABLE "settings" DROP COLUMN IF EXISTS "secondary_language";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "post_permalink_structure";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "week_starts_on";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "time_format";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "date_format";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "timezone";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "favicon_id";
  ALTER TABLE "settings" DROP COLUMN IF EXISTS "logo_id";
  `)
}
