-- El admin puede devolver a disponible el stock que quedó reservado.
-- El carrito que tenía ese producto queda inhabilitado para comprar.

ALTER TABLE "Cart" ADD COLUMN "purchaseBlocked" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "StockRelease" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockRelease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderStockWaiver" (
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "OrderStockWaiver_pkey" PRIMARY KEY ("orderId","productId")
);

CREATE INDEX "StockRelease_productId_createdAt_idx" ON "StockRelease"("productId", "createdAt");
CREATE INDEX "StockRelease_branchId_idx" ON "StockRelease"("branchId");
CREATE INDEX "OrderStockWaiver_productId_idx" ON "OrderStockWaiver"("productId");

ALTER TABLE "StockRelease" ADD CONSTRAINT "StockRelease_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockRelease" ADD CONSTRAINT "StockRelease_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderStockWaiver" ADD CONSTRAINT "OrderStockWaiver_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderStockWaiver" ADD CONSTRAINT "OrderStockWaiver_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
