/*
  Warnings:

  - Added the required column `addressId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "addressId" TEXT NOT NULL,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "totalAmount" DECIMAL(10,2) NOT NULL;

-- CreateIndex
CREATE INDEX "Order_addressId_idx" ON "Order"("addressId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
