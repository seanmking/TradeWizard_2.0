import { MCPOutputMode } from './types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TransformResult {
  ui_format?: string;
  agent_format?: Record<string, unknown>;
  insight?: string;
}

interface TransformOptions {
  enhanced?: boolean;
  context?: string;
}

export class MCPTransformer {
  static async transformOutput<T>(
    data: T,
    mode: MCPOutputMode,
    options: TransformOptions = {}
  ): Promise<TransformResult> {
    const result: TransformResult = {};

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

  private static transformToAgentFormat<T>(data: T): Record<string, unknown> {
    return this.flattenObject(data);
  }

  private static async transformToUIFormat<T>(data: T, context?: string): Promise<string> {
    const dataStr = JSON.stringify(data, null, 2);
    const prompt = `Convert the following trade data into a clear, concise summary in natural language. 
    Context: ${context || 'Trade data summary'}
    Data: ${dataStr}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0].message?.content || JSON.stringify(data);
  }

  private static async generateEnhancedInsight<T>(data: T, context?: string): Promise<string> {
    const dataStr = JSON.stringify(data, null, 2);
    const prompt = `Analyze this trade data and provide key strategic insights and recommendations:
    Context: ${context || 'Trade analysis'}
    Data: ${dataStr}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    });

    return completion.choices[0].message?.content || '';
  }

  private static flattenObject(obj: unknown, prefix = ''): Record<string, unknown> {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return { [prefix]: obj };
    }

    return Object.entries(obj as Record<string, unknown>).reduce(
      (acc: Record<string, unknown>, [key, value]) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(acc, this.flattenObject(value, pre + key));
        } else {
          acc[pre + key] = value;
        }
        return acc;
      },
      {}
    );
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
