-- CreateEnum
CREATE TYPE "Fulfillment" AS ENUM ('delivery', 'pickup');

-- AlterTable
-- Los pedidos existentes quedan como domicilio (ya tienen dirección); los de retiro no la llevan.
ALTER TABLE "Order" ADD COLUMN     "fulfillment" "Fulfillment" NOT NULL DEFAULT 'delivery',
ALTER COLUMN "addressId" DROP NOT NULL;
