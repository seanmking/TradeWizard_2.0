import { PrismaClient, AssessmentQuestion, AssessmentCategory } from '@prisma/client';
import { MCPService } from '../services/mcp.service';
import { EnhancedQuestionData, MCPQuery } from '../types/mcp.types';

interface ProductSpecifications {
  companySize?: string;
  targetMarkets?: string[];
  [key: string]: unknown;
}

export class AssessmentController {
  private prisma = new PrismaClient();
  private mcpService = new MCPService();

  async getNextQuestion(userId: string): Promise<EnhancedQuestionData> {
    // Get user's product sector from previous phase
    const userSector = await this.getUserSector(userId);

    // Get user's assessment progress
    const progress = await this.prisma.assessmentProgress.findUnique({
      where: { userId },
    });

    // Select next question based on:
    // 1. User's sector
    // 2. Previous answers
    // 3. Remaining critical gaps
    const nextQuestion = await this.selectNextQuestion(
      userId,
      userSector,
      progress?.completedQuestionIds || []
    );

    if (!nextQuestion) {
      throw new Error('No more questions available');
    }

    // Enhance question with MCP marketing data
    return this.enhanceQuestionWithMCPData(nextQuestion, userId);
  }

  private async selectNextQuestion(
    userId: string,
    userSector: string,
    completedQuestionIds: string[]
  ): Promise<AssessmentQuestion | null> {
    // Prioritize questions:
    // 1. Uncompleted baseline questions
    // 2. Sector-specific questions
    // 3. Follow-up questions
    const questions = await this.prisma.assessmentQuestion.findMany({
      where: {
        id: { notIn: completedQuestionIds },
        OR: [{ sectorRelevance: { isEmpty: true } }, { sectorRelevance: { has: userSector } }],
      },
      orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }],
      take: 1,
    });

    return questions[0] || null;
  }

  private async enhanceQuestionWithMCPData(
    question: AssessmentQuestion,
    userId: string
  ): Promise<EnhancedQuestionData> {
    if (!question.mcpRequirements) {
      return { question };
    }

    try {
      // Resolve dynamic parameters
      const params = await this.resolveMCPQueryParameters(
        JSON.parse(question.mcpRequirements as string) as MCPQuery,
        userId
      );

      // Fetch from MCP
      const mcpResponse = await this.mcpService.fetchData(
        JSON.parse(question.mcpRequirements as string) as MCPQuery,
        params
      );

      if (mcpResponse.status === 'success') {
        return this.interpolateQuestionText(question, mcpResponse.data);
      }

      // Fallback for MCP service issues
      return {
        question,
        enhancedPrefix:
          "We're gathering trade intelligence for your specific product. A specialist will follow up with verified data.",
      };
    } catch (error) {
      console.error('MCP service error:', error);
      return { question };
    }
  }

  async submitAnswer(userId: string, questionId: string, answer: string) {
    // Validate and store user's answer
    const response = await this.prisma.response.create({
      data: {
        userId,
        questionId,
        answerValue: answer,
      },
    });

    // Update progress
    await this.updateAssessmentProgress(userId, questionId);

    return response;
  }

  private async updateAssessmentProgress(userId: string, questionId: string) {
    // Update completed questions
    await this.prisma.assessmentProgress.upsert({
      where: { userId },
      update: {
        completedQuestionIds: {
          push: questionId,
        },
      },
      create: {
        userId,
        completedQuestionIds: [questionId],
        overallProgress: 0,
        completedCategoryIds: [],
      },
    });

    // Recalculate overall progress
    await this.calculateProgress(userId);
  }

  async calculateProgress(userId: string) {
    const categories = await this.prisma.assessmentCategory.findMany({
      include: { questions: true },
    });

    const progress = await this.prisma.assessmentProgress.findUnique({
      where: { userId },
    });

    let overallProgress = 0;
    const categoryProgresses = categories.map(
      (category: AssessmentCategory & { questions: AssessmentQuestion[] }) => {
        const completedQuestions =
          progress?.completedQuestionIds.filter((qId: string) =>
            category.questions.some(q => q.id === qId)
          ).length || 0;

        const categoryProgress = (completedQuestions / category.questions.length) * 100;

        overallProgress += categoryProgress;

        return {
          categoryId: category.id,
          categoryName: category.name,
          progress: categoryProgress,
        };
      }
    );

    overallProgress /= categories.length;

    // Estimated completion time (5 minutes per remaining category)
    const remainingCategories = categories.length - (progress?.completedCategoryIds?.length || 0);
    const estimatedCompletionTime = remainingCategories * 5;

    // Update assessment progress
    await this.prisma.assessmentProgress.update({
      where: { userId },
      data: {
        overallProgress,
        estimatedCompletionTime,
        completedCategoryIds: categoryProgresses
          .filter(cp => cp.progress === 100)
          .map(cp => cp.categoryId),
      },
    });

    return {
      overallProgress,
      estimatedCompletionTime,
      categoryProgresses,
    };
  }

  private async getUserSector(userId: string): Promise<string> {
    const product = await this.prisma.product.findFirst({
      where: { userId },
      select: { category: true },
    });

    if (!product?.category) {
      throw new Error('Product category not found. Please complete product assessment first.');
    }

    return product.category;
  }

  private async resolveMCPQueryParameters(
    query: MCPQuery,
    userId: string
  ): Promise<Record<string, string>> {
    const product = await this.prisma.product.findFirst({
      where: { userId },
      select: {
        category: true,
        specifications: true,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const specs = (product.specifications as ProductSpecifications) || {};

    return {
      sector: product.category || '',
      company_size: specs.companySize || '',
      target_markets: Array.isArray(specs.targetMarkets) ? specs.targetMarkets.join(',') : '',
    };
  }

  private interpolateQuestionText(
    question: AssessmentQuestion,
    mcpData: Record<string, string | number | string[]>
  ): EnhancedQuestionData {
    if (!question.marketingPrefix) {
      return { question };
    }

    // Replace placeholders in the marketing prefix
    const enhancedPrefix = Object.entries(mcpData).reduce(
      (text, [key, value]) => text.replace(`{${key}}`, String(value)),
      question.marketingPrefix
    );

    return {
      question,
      enhancedPrefix,
      confidence: mcpData.confidence_score ? Number(mcpData.confidence_score) : undefined,
    };
  }
}

// Export singleton instance
export const assessmentController = new AssessmentController();
