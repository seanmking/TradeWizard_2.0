import { MCPQuery, MCPResponse } from '../types/mcp.types';
import axios from 'axios';
import Redis from 'ioredis';

export class MCPService {
  private redis: Redis;
  private mcpEndpoints = {
    'market-intelligence': process.env.MCP_MARKET_INTELLIGENCE_URL,
    compliance: process.env.MCP_COMPLIANCE_URL,
  };

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }
    this.redis = new Redis(redisUrl);
  }

  async fetchData(query: MCPQuery, parameters: Record<string, string>): Promise<MCPResponse> {
    // Check cache first
    const cacheKey = this.generateCacheKey(query, parameters);
    const cachedResponse = await this.redis.get(cacheKey);

    if (cachedResponse) {
      return JSON.parse(cachedResponse) as MCPResponse;
    }

    try {
      const endpoint = this.mcpEndpoints[query.mcp];
      if (!endpoint) {
        throw new Error(`No endpoint configured for MCP type: ${query.mcp}`);
      }

      const response = await axios.post<MCPResponse>(endpoint, {
        query_type: query.query_type,
        parameters,
        required_fields: query.required_fields,
      });

      // Cache successful response
      if (response.data.status === 'success') {
        await this.redis.set(
          cacheKey,
          JSON.stringify(response.data),
          'EX',
          24 * 60 * 60 // 24-hour cache
        );
      }

      return response.data;
    } catch (error) {
      console.error('MCP Service Error:', error);
      return {
        status: 'error',
        data: {},
        metadata: {
          source: 'MCP_SERVICE',
          confidence_score: 0,
          last_updated: new Date().toISOString(),
        },
      };
    }
  }

  private generateCacheKey(query: MCPQuery, parameters: Record<string, string>): string {
    const paramString = Object.entries(parameters)
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return `mcp:${query.mcp}:${query.query_type}:${paramString}`;
  }
}

// Export singleton instance
export const mcpService = new MCPService();
