-- Respuesta del reclamo y cupón exclusivo de un monto fijo para ese cliente.
ALTER TABLE "Incident" ADD COLUMN "response" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Incident" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Incident" ADD COLUMN "couponAmount" DECIMAL(10,2);

CREATE UNIQUE INDEX "Incident_couponCode_key" ON "Incident"("couponCode");

-- Pedido que consumió el cupón. Se vacía al cancelar.
ALTER TABLE "Order" ADD COLUMN "couponIncidentId" TEXT;

CREATE UNIQUE INDEX "Order_couponIncidentId_key" ON "Order"("couponIncidentId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_couponIncidentId_fkey" FOREIGN KEY ("couponIncidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
