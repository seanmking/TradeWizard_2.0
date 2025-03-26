import { MCPOutputMode } from './schema';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class MCPTransformer {
  static async transformOutput<T>(
    data: T,
    mode: MCPOutputMode,
    options: {
      enhanced?: boolean;
      context?: string;
    } = {}
  ): Promise<{
    ui_format?: string;
    agent_format?: Record<string, any>;
    insight?: string;
  }> {
    const result: {
      ui_format?: string;
      agent_format?: Record<string, any>;
      insight?: string;
    } = {};

    if (mode === 'agent' || mode === 'both') {
      result.agent_format = this.transformToAgentFormat(data);
    }

    if (mode === 'ui' || mode === 'both') {
      result.ui_format = await this.transformToUIFormat(data, options.context);
    }

    if (options.enhanced) {
      result.insight = await this.generateEnhancedInsight(data, options.context);
    }

    return result;
  }

  private static transformToAgentFormat<T>(data: T): Record<string, any> {
    // Convert to a flat, normalized structure for agent consumption
    return this.flattenObject(data);
  }

  private static async transformToUIFormat<T>(
    data: T,
    context?: string
  ): Promise<string> {
    // Convert to human-readable format
    const dataStr = JSON.stringify(data, null, 2);
    const prompt = `Convert the following trade data into a clear, concise summary in natural language. 
    Context: ${context || 'Trade data summary'}
    Data: ${dataStr}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0].message?.content || JSON.stringify(data);
  }

  private static async generateEnhancedInsight<T>(
    data: T,
    context?: string
  ): Promise<string> {
    const dataStr = JSON.stringify(data, null, 2);
    const prompt = `Analyze this trade data and provide key strategic insights and recommendations:
    Context: ${context || 'Trade analysis'}
    Data: ${dataStr}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    });

    return completion.choices[0].message?.content || '';
  }

  private static flattenObject(obj: any, prefix = ''): Record<string, any> {
    return Object.keys(obj).reduce((acc: Record<string, any>, k: string) => {
      const pre = prefix.length ? prefix + '.' : '';
      if (
        typeof obj[k] === 'object' &&
        obj[k] !== null &&
        !Array.isArray(obj[k])
      ) {
        Object.assign(acc, this.flattenObject(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  }
}

export function transformResponse<T>(data: unknown): T {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response data');
  }
  return data as T;
}

export function transformError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error('Unknown error occurred');
} 