import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds optional Category.thumbnail → media upload relation.
 * Non-destructive: existing category rows remain valid with NULL thumbnail.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "thumbnail_id" integer;
    DO $$ BEGIN
      ALTER TABLE "categories"
        ADD CONSTRAINT "categories_thumbnail_id_media_id_fk"
        FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS "categories_thumbnail_idx" ON "categories" USING btree ("thumbnail_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_thumbnail_id_media_id_fk";
    DROP INDEX IF EXISTS "categories_thumbnail_idx";
    ALTER TABLE "categories" DROP COLUMN IF EXISTS "thumbnail_id";
  `)
}
