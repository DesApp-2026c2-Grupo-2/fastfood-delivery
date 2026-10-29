-- El premio y el cierre de la tarjeta quedan en el pedido. No se infieren del texto del nombre.
ALTER TABLE "Order" ADD COLUMN "loyaltyCycleCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "loyaltyRewardApplied" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Order"
SET "loyaltyCycleCompleted" = true,
    "loyaltyRewardApplied" = true
WHERE "promotionName" ILIKE '%Premio Fidelidad%';
