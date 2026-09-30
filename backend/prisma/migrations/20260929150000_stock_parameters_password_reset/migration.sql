-- Sprint 3: stock por sucursal (HU-17, HU-18), parámetros del sistema (HU-19) y recuperar contraseña (HU-15).

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stockReserved" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id"),
    -- Prisma no modela CHECK; el API nunca deja cantidades negativas, esto es la red de seguridad.
    CONSTRAINT "Stock_available_check" CHECK ("available" >= 0),
    CONSTRAINT "Stock_reserved_check" CHECK ("reserved" >= 0)
);

-- CreateTable
CREATE TABLE "Parameter" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parameter_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Stock_productId_idx" ON "Stock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_branchId_productId_key" ON "Stock"("branchId", "productId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Valores iniciales de los parámetros: los que el API usaba fijos hasta ahora (src/parameters/parameters.ts).
INSERT INTO "Parameter" ("key", "value", "updatedAt") VALUES
  ('coverage_radius_km', '5', CURRENT_TIMESTAMP),
  ('eta_prep_base_min', '15', CURRENT_TIMESTAMP),
  ('eta_min_per_item', '3', CURRENT_TIMESTAMP),
  ('eta_km_per_min', '0.5', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Hasta ahora se vendía sin stock. Para que el checkout no quede cortado al aplicar la migración
-- (por ejemplo en Neon), cada producto existente arranca con 100 unidades en cada sucursal existente.
-- Lo que se cree después arranca sin fila, o sea en 0, hasta que el admin cargue stock.
INSERT INTO "Stock" ("id", "branchId", "productId", "available", "reserved", "updatedAt")
SELECT 'stk_' || md5(b."id" || ':' || p."id"), b."id", p."id", 100, 0, CURRENT_TIMESTAMP
FROM "Branch" b
CROSS JOIN "Product" p;
