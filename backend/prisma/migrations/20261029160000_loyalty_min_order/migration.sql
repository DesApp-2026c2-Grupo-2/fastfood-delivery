-- Monto mínimo de subtotal para sumar una estampa de fidelidad.
INSERT INTO "Parameter" ("key", "value", "updatedAt") VALUES
  ('loyalty_min_order_amount', '15000', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
