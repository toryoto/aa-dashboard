-- CreateTable
CREATE TABLE "user_operations" (
    "id" SERIAL NOT NULL,
    "userOpHash" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "nonce" BIGINT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockTimestamp" BIGINT NOT NULL,
    "calldata" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "error" TEXT,
    "initCode" TEXT,

    CONSTRAINT "user_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_operations_userOpHash_key" ON "user_operations"("userOpHash");

-- CreateIndex
CREATE INDEX "user_operations_sender_idx" ON "user_operations"("sender");

-- CreateIndex
CREATE INDEX "user_operations_transactionHash_idx" ON "user_operations"("transactionHash");

-- CreateIndex
CREATE INDEX "user_operations_blockTimestamp_idx" ON "user_operations"("blockTimestamp");
