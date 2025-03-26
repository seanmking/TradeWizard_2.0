-- CreateTable
CREATE TABLE "MarketIntelligence" (
    "id" TEXT NOT NULL,
    "hsCodePrefix" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "competing_products" JSONB NOT NULL,
    "price_point_recommendation" TEXT NOT NULL,
    "market_entry_difficulty" TEXT NOT NULL,
    "potential_advantage" TEXT NOT NULL,
    "market_size" DOUBLE PRECISION NOT NULL,
    "growth_rate" DOUBLE PRECISION NOT NULL,
    "key_competitors" TEXT[],
    "entry_barriers" TEXT[],
    "regulatory_requirements" TEXT[],
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketIntelligence_hsCodePrefix_market_idx" ON "MarketIntelligence"("hsCodePrefix", "market");

-- CreateIndex
CREATE INDEX "MarketIntelligence_validUntil_idx" ON "MarketIntelligence"("validUntil");
