-- Horario por día de la sucursal, y pedidos programados para la próxima apertura.
CREATE TABLE "BranchHour" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,

    CONSTRAINT "BranchHour_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BranchHour_branchId_weekday_key" ON "BranchHour"("branchId", "weekday");
CREATE INDEX "BranchHour_branchId_idx" ON "BranchHour"("branchId");

ALTER TABLE "BranchHour" ADD CONSTRAINT "BranchHour_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "scheduledFor" TIMESTAMP(3);
