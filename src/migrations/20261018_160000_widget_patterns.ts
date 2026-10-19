import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Scoped to WidgetPatterns. The repository's initial snapshot predates later hand-written migrations;
// migrate:create prompts about unrelated enum renames, so no broad generated schema diff is applied.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "widget_patterns" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "description" varchar,
      "category" varchar NOT NULL,
      "source" varchar DEFAULT 'user' NOT NULL,
      "owner_id" integer NOT NULL,
      "record" jsonb NOT NULL,
      "content_hash" varchar NOT NULL,
      "thumbnail_hash" varchar,
      "thumbnail_status" varchar DEFAULT 'pending',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric
    );
    ALTER TABLE "widget_patterns" ADD CONSTRAINT "widget_patterns_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "widget_patterns_owner_idx" ON "widget_patterns" USING btree ("owner_id");
    CREATE INDEX "widget_patterns_updated_at_idx" ON "widget_patterns" USING btree ("updated_at");
    CREATE INDEX "widget_patterns_created_at_idx" ON "widget_patterns" USING btree ("created_at");
    CREATE UNIQUE INDEX "widget_patterns_filename_idx" ON "widget_patterns" USING btree ("filename");
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "widget_patterns_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_widget_patterns_fk" FOREIGN KEY ("widget_patterns_id") REFERENCES "public"."widget_patterns"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_widget_patterns_id_idx" ON "payload_locked_documents_rels" USING btree ("widget_patterns_id");
  `)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "widget_patterns_id";
    DROP TABLE "widget_patterns";
  `)
}
