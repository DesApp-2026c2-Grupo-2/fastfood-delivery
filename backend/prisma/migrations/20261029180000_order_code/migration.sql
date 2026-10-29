-- Código corto (100000–999999) para dictar el pedido en el local. Si choca, se reintenta.
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  tries int := 0;
BEGIN
  LOOP
    candidate := (100000 + floor(random() * 900000))::int::text;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM "Order" WHERE code = candidate);
    tries := tries + 1;
    IF tries >= 5 THEN
      RAISE EXCEPTION 'No se pudo generar un código de pedido';
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

ALTER TABLE "Order" ADD COLUMN "code" TEXT;

WITH numbered AS (
  SELECT id, (100000 + row_number() OVER (ORDER BY "createdAt", id) - 1)::int AS n
  FROM "Order"
)
UPDATE "Order" AS o
SET code = numbered.n::text
FROM numbered
WHERE o.id = numbered.id;

ALTER TABLE "Order" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "code" SET DEFAULT generate_order_code();
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");
