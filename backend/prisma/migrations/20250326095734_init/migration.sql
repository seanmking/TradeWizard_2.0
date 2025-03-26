-- CreateTable
CREATE TABLE "HSCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "subheading" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HSCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HSCodeMapping" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HSCodeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRequirement" (
    "id" TEXT NOT NULL,
    "hsCodePrefix" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "requirements" TEXT[],
    "certifications" TEXT[],
    "documentation" TEXT[],
    "restrictions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memory" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "specifications" JSONB,
    "manufacturer" TEXT,
    "origin" TEXT,
    "images" TEXT[],
    "hsCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HSCode_code_key" ON "HSCode"("code");

-- CreateIndex
CREATE INDEX "HSCodeMapping_code_idx" ON "HSCodeMapping"("code");

-- CreateIndex
CREATE INDEX "HSCodeMapping_name_idx" ON "HSCodeMapping"("name");

-- CreateIndex
CREATE INDEX "ComplianceRequirement_hsCodePrefix_market_idx" ON "ComplianceRequirement"("hsCodePrefix", "market");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_hsCode_idx" ON "Product"("hsCode");
