-- Fecha en la que se generó el cupón del reclamo. Los que ya existían toman la fecha en que se resolvió.
ALTER TABLE "Incident" ADD COLUMN "couponCreatedAt" TIMESTAMP(3);

UPDATE "Incident"
SET "couponCreatedAt" = COALESCE("resolvedAt", "createdAt")
WHERE "couponCode" IS NOT NULL;
