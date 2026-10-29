-- AlterTable
-- Baja lógica de clientes: los usuarios existentes quedan habilitados.
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;
