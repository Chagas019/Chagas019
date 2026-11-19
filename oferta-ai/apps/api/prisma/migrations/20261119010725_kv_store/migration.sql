-- CreateTable
CREATE TABLE "KvStore" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KvStore_pkey" PRIMARY KEY ("key")
);
