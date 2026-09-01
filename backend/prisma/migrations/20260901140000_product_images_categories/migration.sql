-- Product slug
ALTER TABLE "Product" ADD COLUMN "slug" TEXT;

UPDATE "Product"
SET "slug" = trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')));

UPDATE "Product"
SET "slug" = 'prod-' || "id"
WHERE "slug" IS NULL OR "slug" = '';

UPDATE "Product" AS p
SET "slug" = p."slug" || '-' || right(p."id", 6)
WHERE p."id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS n
    FROM "Product"
  ) ranked
  WHERE ranked.n > 1
);

ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- Product images (copy the previous single URL)
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ProductImage" ("id", "url", "sortOrder", "productId")
SELECT "id" || '-img', "imageUrl", 0, "id"
FROM "Product"
WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';

CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Many-to-many categories (Prisma implicit table)
CREATE TABLE "_ProductCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

INSERT INTO "_ProductCategories" ("A", "B")
SELECT "categoryId", "id" FROM "Product";

CREATE UNIQUE INDEX "_ProductCategories_AB_unique" ON "_ProductCategories"("A", "B");
CREATE INDEX "_ProductCategories_B_index" ON "_ProductCategories"("B");

ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_B_fkey"
  FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the old single category / single image columns
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";
DROP INDEX "Product_categoryId_idx";
ALTER TABLE "Product" DROP COLUMN "categoryId";
ALTER TABLE "Product" DROP COLUMN "imageUrl";
