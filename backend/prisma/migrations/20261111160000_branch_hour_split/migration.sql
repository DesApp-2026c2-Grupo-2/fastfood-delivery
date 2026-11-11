-- Un día puede tener una segunda franja (horario partido).
ALTER TABLE "BranchHour" ADD COLUMN "slot" INTEGER NOT NULL DEFAULT 0;

DROP INDEX "BranchHour_branchId_weekday_key";

CREATE UNIQUE INDEX "BranchHour_branchId_weekday_slot_key" ON "BranchHour"("branchId", "weekday", "slot");
