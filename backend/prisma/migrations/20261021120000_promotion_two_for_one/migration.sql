-- AlterEnum
ALTER TYPE "PromotionType" ADD VALUE 'two_for_one';

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN "productId" TEXT;

-- CreateIndex
CREATE INDEX "Promotion_productId_idx" ON "Promotion"("productId");

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
