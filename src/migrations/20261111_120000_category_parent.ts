import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds optional self-relation parent for Categories hierarchy.
 * Do not apply automatically against the shared development database —
 * owner runs migrate when ready.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parent_id" integer;
    DO $$ BEGIN
      ALTER TABLE "categories"
        ADD CONSTRAINT "categories_parent_id_categories_id_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" USING btree ("parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parent_id_categories_id_fk";
    DROP INDEX IF EXISTS "categories_parent_idx";
    ALTER TABLE "categories" DROP COLUMN IF EXISTS "parent_id";
  `)
}
