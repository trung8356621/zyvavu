import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_seo_settings_publisher_type" AS ENUM('Organization', 'Person');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  CREATE TABLE IF NOT EXISTS "seo_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "home_title" varchar,
    "home_description" varchar,
    "publisher_type" "enum_seo_settings_publisher_type" DEFAULT 'Organization' NOT NULL,
    "publisher_name" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "seo_settings_same_as" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "url" varchar
  );

  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'seo_settings_same_as_parent_id_fk'
    ) THEN
      ALTER TABLE "seo_settings_same_as"
        ADD CONSTRAINT "seo_settings_same_as_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."seo_settings"("id")
        ON DELETE cascade ON UPDATE no action;
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS "seo_settings_same_as_order_idx" ON "seo_settings_same_as" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "seo_settings_same_as_parent_id_idx" ON "seo_settings_same_as" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "seo_settings_same_as";
  DROP TABLE IF EXISTS "seo_settings";
  DROP TYPE IF EXISTS "public"."enum_seo_settings_publisher_type";
  `)
}
