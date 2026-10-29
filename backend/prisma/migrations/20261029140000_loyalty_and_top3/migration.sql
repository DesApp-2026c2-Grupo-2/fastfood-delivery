-- Fidelización por sellos y premio Top 3 compradores (campos de usuario + parámetros configurables).
ALTER TABLE "User" ADD COLUMN "loyaltyStamps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "hasTopBuyerReward" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "Parameter" ("key", "value", "updatedAt") VALUES
  ('loyalty_orders_required', '10', CURRENT_TIMESTAMP),
  ('loyalty_discount_percent', '30', CURRENT_TIMESTAMP),
  ('top3_discount_percent', '15', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
