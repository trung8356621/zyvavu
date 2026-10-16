import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "url_registry" DROP CONSTRAINT IF EXISTS "url_registry_path_not_reserved";

    ALTER TYPE "public"."enum_url_registry_resource_type" RENAME TO "enum_url_registry_resource_type_old";
    CREATE TYPE "public"."enum_url_registry_resource_type" AS ENUM('page', 'post', 'category', 'tag');
    ALTER TABLE "url_registry"
      ALTER COLUMN "resource_type" TYPE "public"."enum_url_registry_resource_type"
      USING "resource_type"::text::"public"."enum_url_registry_resource_type";
    DROP TYPE "public"."enum_url_registry_resource_type_old";

    ALTER TABLE "url_registry" ADD CONSTRAINT "url_registry_path_not_reserved" CHECK (
      "path" NOT IN ('/admin', '/api', '/posts', '/_next', '/offline.html', '/manifest.webmanifest', '/sw.js', '/favicon.ico', '/icon.png')
      AND "path" NOT LIKE '/admin/%'
      AND "path" NOT LIKE '/api/%'
      AND "path" NOT LIKE '/_next/%'
      AND "path" NOT LIKE '/icons/%'
      AND NOT ("resource_type" = 'page'::"public"."enum_url_registry_resource_type" AND "path" LIKE '/posts/%')
    );

    ALTER TABLE "url_registry" ADD COLUMN IF NOT EXISTS "category_id" integer;
    ALTER TABLE "url_registry" ADD COLUMN IF NOT EXISTS "tag_id" integer;

    DO $$ BEGIN
      ALTER TABLE "url_registry" ADD CONSTRAINT "url_registry_category_id_categories_id_fk"
        FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "url_registry" ADD CONSTRAINT "url_registry_tag_id_tags_id_fk"
        FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "url_registry_category_idx" ON "url_registry" USING btree ("category_id");
    CREATE INDEX IF NOT EXISTS "url_registry_tag_idx" ON "url_registry" USING btree ("tag_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "url_registry_canonical_category_idx" ON "url_registry" ("category_id") WHERE "record_role" = 'canonical' AND "category_id" IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "url_registry_canonical_tag_idx" ON "url_registry" ("tag_id") WHERE "record_role" = 'canonical' AND "tag_id" IS NOT NULL;

    INSERT INTO "url_registry" ("path", "record_role", "resource_type", "category_id", "updated_at", "created_at")
    SELECT
      LOWER(REPLACE(COALESCE((SELECT NULLIF(TRIM("category_permalink_structure"), '') FROM "settings" LIMIT 1), '/category/%term%'), '%term%', c."slug")),
      'canonical'::"public"."enum_url_registry_record_role",
      'category'::"public"."enum_url_registry_resource_type",
      c."id",
      now(),
      now()
    FROM "categories" c
    WHERE c."slug" IS NOT NULL AND TRIM(c."slug") <> ''
      AND NOT EXISTS (
        SELECT 1 FROM "url_registry" u WHERE u."record_role" = 'canonical' AND u."category_id" = c."id"
      )
    ON CONFLICT DO NOTHING;

    INSERT INTO "url_registry" ("path", "record_role", "resource_type", "tag_id", "updated_at", "created_at")
    SELECT
      LOWER(REPLACE(COALESCE((SELECT NULLIF(TRIM("tag_permalink_structure"), '') FROM "settings" LIMIT 1), '/tag/%term%'), '%term%', t."slug")),
      'canonical'::"public"."enum_url_registry_record_role",
      'tag'::"public"."enum_url_registry_resource_type",
      t."id",
      now(),
      now()
    FROM "tags" t
    WHERE t."slug" IS NOT NULL AND TRIM(t."slug") <> ''
      AND NOT EXISTS (
        SELECT 1 FROM "url_registry" u WHERE u."record_role" = 'canonical' AND u."tag_id" = t."id"
      )
    ON CONFLICT DO NOTHING;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "url_registry" WHERE "resource_type"::text IN ('category', 'tag');
    DROP INDEX IF EXISTS "url_registry_canonical_category_idx";
    DROP INDEX IF EXISTS "url_registry_canonical_tag_idx";
    DROP INDEX IF EXISTS "url_registry_category_idx";
    DROP INDEX IF EXISTS "url_registry_tag_idx";
    ALTER TABLE "url_registry" DROP CONSTRAINT IF EXISTS "url_registry_category_id_categories_id_fk";
    ALTER TABLE "url_registry" DROP CONSTRAINT IF EXISTS "url_registry_tag_id_tags_id_fk";
    ALTER TABLE "url_registry" DROP COLUMN IF EXISTS "category_id";
    ALTER TABLE "url_registry" DROP COLUMN IF EXISTS "tag_id";

    ALTER TABLE "url_registry" DROP CONSTRAINT IF EXISTS "url_registry_path_not_reserved";
    ALTER TYPE "public"."enum_url_registry_resource_type" RENAME TO "enum_url_registry_resource_type_old";
    CREATE TYPE "public"."enum_url_registry_resource_type" AS ENUM('page', 'post');
    ALTER TABLE "url_registry"
      ALTER COLUMN "resource_type" TYPE "public"."enum_url_registry_resource_type"
      USING "resource_type"::text::"public"."enum_url_registry_resource_type";
    DROP TYPE "public"."enum_url_registry_resource_type_old";

    ALTER TABLE "url_registry" ADD CONSTRAINT "url_registry_path_not_reserved" CHECK (
      "path" NOT IN ('/admin', '/api', '/posts', '/_next', '/offline.html', '/manifest.webmanifest', '/sw.js', '/favicon.ico', '/icon.png')
      AND "path" NOT LIKE '/admin/%'
      AND "path" NOT LIKE '/api/%'
      AND "path" NOT LIKE '/_next/%'
      AND "path" NOT LIKE '/icons/%'
      AND NOT ("resource_type" = 'page'::"public"."enum_url_registry_resource_type" AND "path" LIKE '/posts/%')
    );
  `)
}
