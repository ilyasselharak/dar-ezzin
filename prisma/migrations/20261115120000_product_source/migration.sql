-- Link products cloned from Electro Darna
ALTER TABLE "Product" ADD COLUMN "sourceId" TEXT,
ADD COLUMN "sourceSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Product_sourceId_key" ON "Product"("sourceId");
