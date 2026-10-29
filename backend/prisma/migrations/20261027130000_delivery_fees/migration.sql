-- AlterTable
-- Los pedidos existentes no cobraron envío.
ALTER TABLE "Order" ADD COLUMN     "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DeliveryFeeTier" (
    "id" TEXT NOT NULL,
    "upToKm" DECIMAL(6,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryFeeTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryFeeTier_upToKm_key" ON "DeliveryFeeTier"("upToKm");
