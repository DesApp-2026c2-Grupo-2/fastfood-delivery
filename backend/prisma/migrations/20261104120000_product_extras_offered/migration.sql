-- CreateTable
CREATE TABLE "ProductExtra" (
    "productId" TEXT NOT NULL,
    "extraId" TEXT NOT NULL,

    CONSTRAINT "ProductExtra_pkey" PRIMARY KEY ("productId","extraId")
);

-- CreateIndex
CREATE INDEX "ProductExtra_extraId_idx" ON "ProductExtra"("extraId");

-- AddForeignKey
ALTER TABLE "ProductExtra" ADD CONSTRAINT "ProductExtra_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductExtra" ADD CONSTRAINT "ProductExtra_extraId_fkey" FOREIGN KEY ("extraId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hasta hoy cada hamburguesa ofrecía todos los adicionales: se marcan todos, así el merge no cambia nada.
-- En "_ProductCategories", A es la categoría y B el producto.
INSERT INTO "ProductExtra" ("productId", "extraId")
SELECT DISTINCT host."B", extra."B"
FROM "_ProductCategories" host
JOIN "Category" host_category ON host_category."id" = host."A" AND host_category."slug" = 'hamburguesas'
JOIN "_ProductCategories" extra ON TRUE
JOIN "Category" extra_category ON extra_category."id" = extra."A" AND extra_category."slug" = 'adicional'
WHERE host."B" <> extra."B";
