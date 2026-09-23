-- DropIndex
DROP INDEX "CartItem_cartId_productId_key";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "extrasKey" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "CartItemExtra" (
    "cartItemId" TEXT NOT NULL,
    "extraId" TEXT NOT NULL,

    CONSTRAINT "CartItemExtra_pkey" PRIMARY KEY ("cartItemId","extraId")
);

-- CreateTable
CREATE TABLE "OrderItemExtra" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "extraId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItemExtra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartItemExtra_extraId_idx" ON "CartItemExtra"("extraId");

-- CreateIndex
CREATE INDEX "OrderItemExtra_orderItemId_idx" ON "OrderItemExtra"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemExtra_extraId_idx" ON "OrderItemExtra"("extraId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_extrasKey_key" ON "CartItem"("cartId", "productId", "extrasKey");

-- AddForeignKey
ALTER TABLE "CartItemExtra" ADD CONSTRAINT "CartItemExtra_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "CartItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItemExtra" ADD CONSTRAINT "CartItemExtra_extraId_fkey" FOREIGN KEY ("extraId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemExtra" ADD CONSTRAINT "OrderItemExtra_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemExtra" ADD CONSTRAINT "OrderItemExtra_extraId_fkey" FOREIGN KEY ("extraId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
