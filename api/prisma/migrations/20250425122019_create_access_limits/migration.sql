-- CreateTable
CREATE TABLE "access_limits" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "identifierType" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "firstRequestAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "access_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_limits_identifier_identifierType_feature_key" ON "access_limits"("identifier", "identifierType", "feature");
