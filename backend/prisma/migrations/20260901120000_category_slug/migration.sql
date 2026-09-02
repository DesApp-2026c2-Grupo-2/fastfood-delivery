-- AlterTable
ALTER TABLE "Category" ADD COLUMN "slug" TEXT;

UPDATE "Category"
SET "slug" = trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')));

UPDATE "Category"
SET "slug" = 'cat-' || "id"
WHERE "slug" IS NULL OR "slug" = '';

-- Keep unique if two names collapse to the same slug
UPDATE "Category" AS c
SET "slug" = c."slug" || '-' || right(c."id", 6)
WHERE c."id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS n
    FROM "Category"
  ) ranked
  WHERE ranked.n > 1
);

ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
