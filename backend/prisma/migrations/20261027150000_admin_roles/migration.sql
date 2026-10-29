-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'orders_viewer');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminRole" "AdminRole";

-- Los administradores que ya existían conservan todos los permisos.
UPDATE "User" SET "adminRole" = 'super_admin' WHERE "role" = 'admin';
