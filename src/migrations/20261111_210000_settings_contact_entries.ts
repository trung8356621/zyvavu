import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds Settings.contactEntries array storage.
 * Root cause of Theme Builder Save/Settings load failure: relation missing (PG 42P01).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_settings_contact_entries_semantics" AS ENUM('phone', 'email');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  CREATE TABLE IF NOT EXISTS "settings_contact_entries" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "entry_id" varchar NOT NULL,
    "key" varchar NOT NULL,
    "value" varchar NOT NULL,
    "link" varchar,
    "semantics" "enum_settings_contact_entries_semantics",
    "order" numeric DEFAULT 0
  );

  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'settings_contact_entries_parent_id_fk'
    ) THEN
      ALTER TABLE "settings_contact_entries"
        ADD CONSTRAINT "settings_contact_entries_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id")
        ON DELETE cascade ON UPDATE no action;
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS "settings_contact_entries_order_idx"
    ON "settings_contact_entries" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "settings_contact_entries_parent_id_idx"
    ON "settings_contact_entries" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "settings_contact_entries";
  DROP TYPE IF EXISTS "public"."enum_settings_contact_entries_semantics";
  `)
}
