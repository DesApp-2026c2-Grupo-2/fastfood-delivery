-- El envío pasa de tramos de distancia a un precio por km, que el admin edita como parámetro del sistema.
DROP TABLE "DeliveryFeeTier";

-- Arranca en 0 (envío gratis) hasta que el admin cargue el precio.
INSERT INTO "Parameter" ("key", "value", "updatedAt") VALUES
  ('delivery_price_per_km', '0', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
