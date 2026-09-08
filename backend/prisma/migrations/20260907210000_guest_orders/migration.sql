-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "guestName" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "guestEmail" TEXT;
