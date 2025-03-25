import { Injectable } from '@nestjs/common';
import { Logger } from '../../utils/logger';
import { AIOrchestrator } from '../ai/ai-orchestrator.service';
import { EnhancedProduct, BusinessAnalysis } from '../../types/ai-orchestrator.types';
import { RawMarketData } from '../../types/context-builder.types';
import {
  MarketAnalysis,
  MarketAnalysisConfig,
  MarketAnalysisResult,
  MarketFitAnalysis,
  MarketMetric,
  MarketOpportunity,
  MarketRisk
} from '../../types/market-analysis.types';

@Injectable()
export class MarketAnalysisService {
  private readonly logger: Logger;
  private readonly config: MarketAnalysisConfig;

  constructor(
    private readonly aiOrchestrator: AIOrchestrator
  ) {
    this.logger = new Logger(MarketAnalysisService.name);
    this.config = {
      priorityMarkets: ['USA', 'EU', 'UK', 'Canada', 'Australia'],
      minConfidenceScore: 0.7,
      maxMarketsToAnalyze: 5,
      weightings: {
        marketSize: 0.3,
        growthRate: 0.25,
        competition: 0.2,
        entryBarriers: 0.15,
        regulations: 0.1
      }
    };
  }

  async analyzeMarkets(
    products: EnhancedProduct[],
    marketData: RawMarketData[]
  ): Promise<MarketAnalysisResult> {
    this.logger.info('Starting market analysis', {
      productCount: products.length,
      marketCount: marketData.length
    });

    try {
      // Filter and prioritize markets
      const prioritizedMarkets = this.prioritizeMarkets(marketData);
      
      // Analyze each market
      const analyses = await Promise.all(
        prioritizedMarkets.map(data => this.analyzeMarket(data))
      );

      // Analyze product-market fit
      const productFit = await this.analyzeProductMarketFit(products, analyses);

      // Generate summary and recommendations
      const summary = this.generateSummary(analyses, productFit);

      // Calculate metadata
      const metadata = this.calculateMetadata(analyses, marketData);

      return {
        timestamp: new Date().toISOString(),
        analyses,
        productFit,
        summary,
        metadata
      };
    } catch (error) {
      this.logger.error('Error during market analysis', { error });
      throw error;
    }
  }

  private prioritizeMarkets(marketData: RawMarketData[]): RawMarketData[] {
    return marketData
      .sort((a, b) => {
        // Prioritize configured priority markets
        const aPriority = this.config.priorityMarkets.includes(a.market);
        const bPriority = this.config.priorityMarkets.includes(b.market);
        if (aPriority !== bPriority) return bPriority ? 1 : -1;

        // Then sort by market size and growth potential
        const aScore = this.getMarketScore(a);
        const bScore = this.getMarketScore(b);
        return bScore - aScore;
      })
      .slice(0, this.config.maxMarketsToAnalyze);
  }

  private getMarketScore(marketData: RawMarketData): number {
    const marketSize = this.extractMarketDataValue(marketData, 'marketSize', 0);
    const growthRate = this.extractMarketDataValue(marketData, 'growthRate', 0);
    return marketSize * growthRate;
  }

  private async analyzeMarket(marketData: RawMarketData): Promise<MarketAnalysis> {
    this.logger.info('Analyzing market', { market: marketData.market });

    // Extract and validate metrics
    const metrics = this.extractMarketMetrics(marketData);

    // Get AI-enhanced analysis using generateBusinessAnalysis
    const analysisContext = {
      businessProfile: {
        businessName: 'Market Analysis',
        industry: marketData.productType,
        subIndustry: marketData.productType,
        marketFocus: 'International',
        businessSize: 'Unknown',
        productCategories: [marketData.productType],
        exportReadinessIndicators: {}
      },
      products: [],
      complianceData: [],
      marketData: [{
        hsCode: '',
        market: marketData.market,
        insights: {
          marketSize: this.extractMarketDataValue(marketData, 'marketSize', 0),
          growthRate: this.extractMarketDataValue(marketData, 'growthRate', 0),
          competitorAnalysis: [],
          pricingTrends: {
            averagePrice: 0,
            priceRange: { min: 0, max: 0 },
            trends: []
          },
          consumerPreferences: [],
          entryBarriers: [],
          distributionChannels: []
        }
      }],
      timestamp: new Date().toISOString()
    };

    const aiAnalysis = await this.aiOrchestrator.generateBusinessAnalysis(analysisContext);

    return {
      market: marketData.market,
      overview: {
        size: this.extractMarketDataValue(marketData, 'marketSize', 0),
        growth: this.extractMarketDataValue(marketData, 'growthRate', 0),
        maturity: this.determineMarketMaturity(marketData),
        volatility: this.calculateVolatility(metrics)
      },
      metrics,
      indicators: this.convertToIndicators(aiAnalysis),
      competition: this.extractCompetitionData(aiAnalysis),
      opportunities: this.identifyOpportunities(marketData, aiAnalysis),
      risks: this.assessRisks(marketData, aiAnalysis),
      timestamp: new Date().toISOString()
    };
  }

  private convertToIndicators(analysis: BusinessAnalysis) {
    return analysis.strengths.map(strength => ({
      name: strength,
      value: 1,
      trend: 'increasing' as const,
      significance: 'high' as const,
      description: strength
    }));
  }

  private extractCompetitionData(analysis: BusinessAnalysis) {
    return {
      marketConcentration: 'medium' as const,
      keyPlayers: [],
      entryBarriers: analysis.challenges.map(challenge => ({
        type: 'barrier',
        severity: 'medium' as const,
        description: challenge
      }))
    };
  }

  private extractMarketMetrics(marketData: RawMarketData): MarketMetric[] {
    const metrics: MarketMetric[] = [];

    // Extract core metrics from data array
    const marketSize = marketData.data.find(d => d.type === 'marketSize');
    if (marketSize) {
      metrics.push({
        type: 'marketSize',
        value: Number(marketSize.value) || 0,
        unit: 'USD',
        confidence: 0.8
      });
    }

    const growthRate = marketData.data.find(d => d.type === 'growthRate');
    if (growthRate) {
      metrics.push({
        type: 'growthRate',
        value: Number(growthRate.value) || 0,
        unit: '%',
        confidence: 0.8
      });
    }

    // Add additional metrics if available
    const importVolume = marketData.data.find(d => d.type === 'importVolume');
    if (importVolume) {
      metrics.push({
        type: 'importVolume',
        value: Number(importVolume.value) || 0,
        unit: 'USD',
        confidence: 0.7
      });
    }

    return metrics;
  }

  private determineMarketMaturity(marketData: RawMarketData): 'emerging' | 'growing' | 'mature' | 'declining' {
    const growth = this.extractMarketDataValue(marketData, 'growthRate', 0);
    const saturation = this.extractMarketDataValue(marketData, 'marketSaturation', 0);

    if (growth > 20 && saturation < 30) return 'emerging';
    if (growth > 10) return 'growing';
    if (growth > 0) return 'mature';
    return 'declining';
  }

  private calculateVolatility(metrics: MarketMetric[]): 'high' | 'medium' | 'low' {
    const volatilityIndicators = metrics.filter(m => 
      ['priceVolatility', 'demandVariability', 'marketUncertainty'].includes(m.type)
    );

    if (volatilityIndicators.length === 0) return 'medium';

    const avgVolatility = volatilityIndicators.reduce((sum, m) => sum + m.value, 0) / volatilityIndicators.length;
    
    if (avgVolatility > 0.7) return 'high';
    if (avgVolatility > 0.3) return 'medium';
    return 'low';
  }

  private identifyOpportunities(
    marketData: RawMarketData,
    aiAnalysis: BusinessAnalysis
  ): MarketOpportunity[] {
    const opportunities: MarketOpportunity[] = [];
    const market = marketData.market;
    const marketSize = this.extractMarketDataValue(marketData, 'marketSize', 0);
    const growthRate = this.extractMarketDataValue(marketData, 'growthRate', 0);

    // Market size opportunity
    if (marketSize > 1000000000) { // $1B market
      opportunities.push({
        market,
        score: 0.8,
        factors: [{
          name: 'Large Market Size',
          impact: 'positive',
          weight: 0.3,
          description: 'Significant market size indicates strong revenue potential'
        }],
        recommendations: [{
          priority: 'high' as const,
          action: 'Develop market entry strategy',
          rationale: 'Large market size justifies investment in comprehensive entry strategy',
          timeline: '3-6 months'
        }]
      });
    }

    // Growth opportunity
    if (growthRate > 10) {
      opportunities.push({
        market,
        score: 0.75,
        factors: [{
          name: 'High Growth Rate',
          impact: 'positive',
          weight: 0.25,
          description: `Market growing at ${growthRate}% annually`
        }],
        recommendations: [{
          priority: 'high' as const,
          action: 'Scale operations',
          rationale: 'High growth rate indicates potential for rapid expansion',
          timeline: '6-12 months'
        }]
      });
    }

    // Add AI-identified opportunities
    if (aiAnalysis.marketOpportunities[market]) {
      opportunities.push({
        market,
        score: aiAnalysis.marketOpportunities[market].score,
        factors: [{
          name: 'AI Identified Opportunity',
          impact: 'positive',
          weight: 0.5,
          description: aiAnalysis.marketOpportunities[market].details
        }],
        recommendations: [{
          priority: 'high' as const,
          action: 'Explore AI-identified opportunity',
          rationale: aiAnalysis.marketOpportunities[market].details,
          timeline: '3-6 months'
        }]
      });
    }

    return opportunities;
  }

  private assessRisks(
    marketData: RawMarketData,
    aiAnalysis: BusinessAnalysis
  ): MarketRisk[] {
    const risks: MarketRisk[] = [];
    const regulatoryComplexity = this.extractMarketDataValue(marketData, 'regulatoryComplexity', 0);
    const competitorCount = this.extractMarketDataValue(marketData, 'competitorCount', 0);

    // Regulatory risks
    if (regulatoryComplexity > 0.7) {
      risks.push({
        type: 'regulatory',
        probability: 'high',
        impact: 'high',
        description: 'Complex regulatory environment requiring significant compliance efforts',
        mitigationStrategies: [
          'Engage local regulatory experts',
          'Develop comprehensive compliance program',
          'Regular monitoring of regulatory changes'
        ]
      });
    }

    // Competition risks
    if (competitorCount > 10) {
      risks.push({
        type: 'competition',
        probability: 'high',
        impact: 'medium',
        description: 'Highly competitive market with multiple established players',
        mitigationStrategies: [
          'Focus on unique value proposition',
          'Identify and target underserved segments',
          'Develop competitive pricing strategy'
        ]
      });
    }

    // Add AI-identified risks
    aiAnalysis.challenges.forEach(challenge => {
      risks.push({
        type: 'ai-identified',
        probability: 'medium',
        impact: 'medium',
        description: challenge,
        mitigationStrategies: aiAnalysis.recommendations.immediate
      });
    });

    return risks;
  }

  private async analyzeProductMarketFit(
    products: EnhancedProduct[],
    marketAnalyses: MarketAnalysis[]
  ): Promise<MarketFitAnalysis[]> {
    const productFitAnalyses: MarketFitAnalysis[] = [];

    for (const product of products) {
      for (const analysis of marketAnalyses) {
        // Create analysis context for the product and market
        const context = {
          businessProfile: {
            businessName: 'Product Market Fit Analysis',
            industry: product.category,
            subIndustry: product.category,
            marketFocus: 'International',
            businessSize: 'Unknown',
            productCategories: [product.category],
            exportReadinessIndicators: {}
          },
          products: [product],
          complianceData: [],
          marketData: [{
            hsCode: product.enhancement?.hsCode || '',
            market: analysis.market,
            insights: {
              marketSize: analysis.overview.size,
              growthRate: analysis.overview.growth,
              competitorAnalysis: [],
              pricingTrends: {
                averagePrice: 0,
                priceRange: { min: 0, max: 0 },
                trends: []
              },
              consumerPreferences: [],
              entryBarriers: [],
              distributionChannels: []
            }
          }],
          timestamp: new Date().toISOString()
        };

        const aiAnalysis = await this.aiOrchestrator.generateBusinessAnalysis(context);

        productFitAnalyses.push({
          product,
          market: analysis.market,
          overallFitScore: aiAnalysis.overallScore,
          dimensions: [
            {
              name: 'Market Potential',
              score: analysis.overview.size > 0 ? 0.8 : 0.4,
              strengths: aiAnalysis.strengths,
              weaknesses: aiAnalysis.challenges
            }
          ],
          recommendations: aiAnalysis.recommendations.immediate.map(rec => ({
            priority: 'high' as const,
            action: rec,
            impact: 'Significant market opportunity',
            effort: 'medium' as const
          }))
        });
      }
    }

    return productFitAnalyses;
  }

  private generateSummary(
    analyses: MarketAnalysis[],
    productFit: MarketFitAnalysis[]
  ) {
    // Calculate top markets based on opportunity scores
    const topMarkets = analyses
      .map(a => ({
        market: a.market,
        score: a.opportunities.reduce((sum, o) => sum + o.score, 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(m => m.market);

    // Calculate average market fit score
    const avgFitScore = productFit.reduce((sum, pf) => sum + pf.overallFitScore, 0) / productFit.length;

    // Generate key findings
    const keyFindings = this.generateKeyFindings(analyses, productFit);

    // Generate recommendations
    const recommendations = this.generateRecommendations(analyses, productFit);

    return {
      topMarkets,
      totalOpportunityScore: analyses.reduce((sum, a) => 
        sum + a.opportunities.reduce((oSum, o) => oSum + o.score, 0), 0
      ),
      averageMarketFitScore: avgFitScore,
      keyFindings,
      recommendations
    };
  }

  private generateKeyFindings(
    analyses: MarketAnalysis[],
    productFit: MarketFitAnalysis[]
  ): string[] {
    const findings: string[] = [];

    // Market size and growth findings
    const totalMarketSize = analyses.reduce((sum, a) => sum + a.overview.size, 0);
    const avgGrowth = analyses.reduce((sum, a) => sum + a.overview.growth, 0) / analyses.length;
    
    findings.push(`Total addressable market size across analyzed markets: $${(totalMarketSize / 1e9).toFixed(2)}B`);
    findings.push(`Average market growth rate: ${avgGrowth.toFixed(1)}%`);

    // Competition findings
    const highCompetitionMarkets = analyses.filter(a => a.competition.marketConcentration === 'high');
    if (highCompetitionMarkets.length > 0) {
      findings.push(`${highCompetitionMarkets.length} markets show high competition levels`);
    }

    // Product-market fit findings
    const goodFitMarkets = productFit.filter(pf => pf.overallFitScore > 0.7);
    if (goodFitMarkets.length > 0) {
      findings.push(`Strong product-market fit identified in ${goodFitMarkets.length} markets`);
    }

    return findings;
  }

  private generateRecommendations(
    analyses: MarketAnalysis[],
    productFit: MarketFitAnalysis[]
  ) {
    const recommendations = [];

    // Priority market recommendations
    for (const analysis of analyses) {
      const fit = productFit.find(pf => pf.market === analysis.market);
      if (fit && fit.overallFitScore > 0.7) {
        const topOpportunity = analysis.opportunities
          .sort((a, b) => b.score - a.score)[0];

        if (topOpportunity) {
          recommendations.push({
            priority: 'high' as const,
            market: analysis.market,
            action: topOpportunity.recommendations[0]?.action || 'Develop market entry strategy',
            rationale: `Strong product-market fit (${(fit.overallFitScore * 100).toFixed(0)}%) with significant opportunity`
          });
        }
      }
    }

    // Risk mitigation recommendations
    for (const analysis of analyses) {
      const highRisks = analysis.risks.filter(r => r.impact === 'high');
      if (highRisks.length > 0) {
        recommendations.push({
          priority: 'high' as const,
          market: analysis.market,
          action: 'Develop risk mitigation strategy',
          rationale: `${highRisks.length} high-impact risks identified requiring immediate attention`
        });
      }
    }

    return recommendations;
  }

  private calculateMetadata(
    analyses: MarketAnalysis[],
    rawData: RawMarketData[]
  ) {
    // Calculate data quality metrics
    const completeness = this.calculateDataCompleteness(rawData);
    const reliability = this.calculateDataReliability(rawData);
    const timeliness = this.calculateDataTimeliness(rawData);

    // Calculate overall analysis confidence
    const analysisConfidence = (completeness + reliability + timeliness) / 3;

    // Identify data gaps
    const dataGaps = this.identifyDataGaps(rawData);

    return {
      dataQuality: {
        completeness,
        reliability,
        timeliness
      },
      analysisConfidence,
      dataGaps
    };
  }

  private calculateDataCompleteness(data: RawMarketData[]): number {
    const requiredFields = ['marketSize', 'growthRate', 'competitorCount', 'regulatoryComplexity'];

    const completenessScores = data.map(market => {
      const presentFields = requiredFields.filter(field => 
        market.data.some(d => d.type === field)
      );
      return presentFields.length / requiredFields.length;
    });

    return completenessScores.reduce((sum, score) => sum + score, 0) / completenessScores.length;
  }

  private calculateDataReliability(data: RawMarketData[]): number {
    // Default confidence value when not provided
    const DEFAULT_CONFIDENCE = 0.7;

    return data.reduce((sum) => {
      // For each market, assign default confidence to all data points
      const confidenceScore = DEFAULT_CONFIDENCE;
      return sum + confidenceScore;
    }, 0) / data.length;
  }

  private calculateDataTimeliness(data: RawMarketData[]): number {
    const currentYear = new Date().getFullYear();
    
    return data.reduce((sum, market) => {
      const dataYear = market.data.find(d => d.type === 'year')?.value || currentYear;
      const age = currentYear - Number(dataYear);
      // Score decreases with age, with a minimum of 0.3
      return sum + Math.max(0.3, 1 - (age * 0.2));
    }, 0) / data.length;
  }

  private identifyDataGaps(data: RawMarketData[]) {
    return data.map(market => {
      const missingData = [];
      const requiredMetrics = ['marketSize', 'growthRate', 'competitorCount', 'regulatoryComplexity'];
      
      for (const metric of requiredMetrics) {
        if (!market.data.some(d => d.type === metric)) {
          missingData.push(metric);
        }
      }

      const impact = missingData.length > 2 ? 'high' as const :
                    missingData.length > 0 ? 'medium' as const : 'low' as const;

      return {
        market: market.market,
        missingData,
        impact
      };
    }).filter(gap => gap.missingData.length > 0);
  }

  private extractMarketDataValue(data: RawMarketData, type: string, defaultValue: number): number {
    const item = data.data.find(d => d.type === type);
    return item ? Number(item.value) || defaultValue : defaultValue;
  }
} 