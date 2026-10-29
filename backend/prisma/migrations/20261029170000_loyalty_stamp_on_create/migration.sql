-- Marca si el pedido otorgó sello al crearse (para revertirlo al cancelar).
ALTER TABLE "Order" ADD COLUMN "loyaltyStampGranted" BOOLEAN NOT NULL DEFAULT false;
