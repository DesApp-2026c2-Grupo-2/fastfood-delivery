-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
