-- DEV-14: hora estimada de entrega fija, calculada al confirmar.
ALTER TABLE "Order" ADD COLUMN "estimatedDeliveryAt" TIMESTAMP(3);

-- Backfill de los pedidos existentes con la misma fórmula que usa el API (src/orders/eta.ts):
-- createdAt + 15 min + 3 min por unidad + ceil(distancia sucursal-dirección en km / 0.5).
-- La distancia es haversine con radio terrestre de 6371 km, igual que src/orders/geo.ts.
WITH "Estimate" AS (
  SELECT
    o."id",
    o."createdAt",
    COALESCE((SELECT SUM(i."quantity") FROM "OrderItem" i WHERE i."orderId" = o."id"), 0) AS "itemCount",
    2 * 6371 * ASIN(LEAST(1, SQRT(
      POWER(SIN(RADIANS((b."latitude" - a."latitude")::double precision) / 2), 2)
      + COS(RADIANS(a."latitude"::double precision)) * COS(RADIANS(b."latitude"::double precision))
        * POWER(SIN(RADIANS((b."longitude" - a."longitude")::double precision) / 2), 2)
    ))) AS "distanceKm"
  FROM "Order" o
  JOIN "Address" a ON a."id" = o."addressId"
  JOIN "Branch" b ON b."id" = o."branchId"
)
UPDATE "Order" o
SET "estimatedDeliveryAt" = e."createdAt"
  + make_interval(mins => (15 + e."itemCount" * 3 + CEIL(e."distanceKm" / 0.5))::int)
FROM "Estimate" e
WHERE e."id" = o."id";

ALTER TABLE "Order" ALTER COLUMN "estimatedDeliveryAt" SET NOT NULL;
