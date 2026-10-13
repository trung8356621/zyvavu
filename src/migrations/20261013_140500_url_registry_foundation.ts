import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "url_registry_menu_backup" AS TABLE "url_registry";

  CREATE TYPE "public"."enum_url_registry_record_role" AS ENUM('canonical', 'redirect');
  CREATE TYPE "public"."enum_url_registry_resource_type" AS ENUM('page', 'post');

  ALTER TABLE "url_registry" ADD COLUMN "record_role" "enum_url_registry_record_role";
  ALTER TABLE "url_registry" ADD COLUMN "resource_type" "enum_url_registry_resource_type";
  ALTER TABLE "url_registry" ADD COLUMN "target_path" varchar;
  ALTER TABLE "url_registry" ADD COLUMN "locale" varchar;
  ALTER TABLE "url_registry" ADD COLUMN "site_key" varchar;

  ALTER TABLE "pages" ADD COLUMN "public_path" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_public_path" varchar;
  ALTER TABLE "posts" ADD COLUMN "public_path" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_public_path" varchar;

  ALTER TABLE "url_registry" DROP CONSTRAINT "url_registry_menu_id_menus_id_fk";
  DROP INDEX "url_registry_menu_idx";
  ALTER TABLE "url_registry" DROP COLUMN "menu_id";
  ALTER TABLE "url_registry" DROP COLUMN "menu_item_id";
  ALTER TABLE "url_registry" DROP COLUMN "label";
  ALTER TABLE "url_registry" DROP COLUMN "kind";
  ALTER TABLE "url_registry_menu_backup" ALTER COLUMN "kind" TYPE varchar USING "kind"::varchar;
  DROP TYPE "public"."enum_url_registry_kind";

  DELETE FROM "url_registry";

  INSERT INTO "url_registry" ("path", "record_role", "resource_type", "page_id", "updated_at", "created_at")
  SELECT
    CASE WHEN "slug" = 'home' THEN '/' ELSE '/' || "slug" END,
    'canonical',
    'page',
    "id",
    now(),
    now()
  FROM "pages"
  WHERE "_status" = 'published' AND "visibility" = 'public' AND "slug" IS NOT NULL;

  INSERT INTO "url_registry" ("path", "record_role", "resource_type", "post_id", "updated_at", "created_at")
  SELECT
    '/posts/' || "slug",
    'canonical',
    'post',
    "id",
    now(),
    now()
  FROM "posts"
  WHERE "_status" = 'published' AND "slug" IS NOT NULL;

  ALTER TABLE "url_registry" ALTER COLUMN "record_role" SET NOT NULL;
  ALTER TABLE "url_registry" ALTER COLUMN "resource_type" SET NOT NULL;
  ALTER TABLE "url_registry" ADD CONSTRAINT "url_registry_path_not_reserved" CHECK (
    "path" NOT IN ('/admin', '/api', '/posts', '/_next', '/offline.html', '/manifest.webmanifest', '/sw.js', '/favicon.ico', '/icon.png')
    AND "path" NOT LIKE '/admin/%'
    AND "path" NOT LIKE '/api/%'
    AND "path" NOT LIKE '/_next/%'
    AND "path" NOT LIKE '/icons/%'
    AND NOT ("resource_type" = 'page' AND "path" LIKE '/posts/%')
  );

  DROP INDEX "url_registry_path_idx";
  CREATE UNIQUE INDEX "url_registry_path_idx" ON "url_registry" USING btree ("path");
  CREATE UNIQUE INDEX "url_registry_canonical_page_idx" ON "url_registry" ("page_id") WHERE "record_role" = 'canonical' AND "page_id" IS NOT NULL;
  CREATE UNIQUE INDEX "url_registry_canonical_post_idx" ON "url_registry" ("post_id") WHERE "record_role" = 'canonical' AND "post_id" IS NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "url_registry" DROP CONSTRAINT IF EXISTS "url_registry_path_not_reserved";
  DROP INDEX IF EXISTS "url_registry_canonical_page_idx";
  DROP INDEX IF EXISTS "url_registry_canonical_post_idx";
  DROP INDEX IF EXISTS "url_registry_path_idx";

  ALTER TABLE "url_registry" DROP COLUMN "record_role";
  ALTER TABLE "url_registry" DROP COLUMN "resource_type";
  ALTER TABLE "url_registry" DROP COLUMN "target_path";
  ALTER TABLE "url_registry" DROP COLUMN "locale";
  ALTER TABLE "url_registry" DROP COLUMN "site_key";
  DROP TYPE "public"."enum_url_registry_record_role";
  DROP TYPE "public"."enum_url_registry_resource_type";

  CREATE TYPE "public"."enum_url_registry_kind" AS ENUM('page', 'post', 'custom');
  ALTER TABLE "url_registry" ADD COLUMN "kind" "enum_url_registry_kind";
  ALTER TABLE "url_registry" ADD COLUMN "menu_id" integer;
  ALTER TABLE "url_registry" ADD COLUMN "menu_item_id" varchar;
  ALTER TABLE "url_registry" ADD COLUMN "label" varchar;

  DELETE FROM "url_registry";
  INSERT INTO "url_registry" (
    "id", "path", "kind", "page_id", "post_id", "menu_id", "menu_item_id", "label", "updated_at", "created_at"
  )
  SELECT
    "id", "path", "kind"::"enum_url_registry_kind", "page_id", "post_id", "menu_id", "menu_item_id", "label", "updated_at", "created_at"
  FROM "url_registry_menu_backup";

  ALTER TABLE "url_registry" ALTER COLUMN "kind" SET NOT NULL;
  ALTER TABLE "url_registry" ALTER COLUMN "menu_id" SET NOT NULL;
  ALTER TABLE "url_registry" ADD CONSTRAINT "url_registry_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "url_registry_path_idx" ON "url_registry" USING btree ("path");
  CREATE INDEX "url_registry_menu_idx" ON "url_registry" USING btree ("menu_id");

  ALTER TABLE "pages" DROP COLUMN "public_path";
  ALTER TABLE "_pages_v" DROP COLUMN "version_public_path";
  ALTER TABLE "posts" DROP COLUMN "public_path";
  ALTER TABLE "_posts_v" DROP COLUMN "version_public_path";

  DROP TABLE "url_registry_menu_backup";

  SELECT setval(pg_get_serial_sequence('url_registry', 'id'), COALESCE((SELECT MAX("id") FROM "url_registry"), 1), true);
  `)
}
