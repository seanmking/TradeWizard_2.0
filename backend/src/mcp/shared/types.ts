export interface MCPHandler<T> {
  handle(params: Record<string, unknown>): Promise<T>;
}

export interface MCPBaseResponse {
  status: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface MCPResponse<T> extends MCPBaseResponse {
  data: T | null;
}

export interface MCPCacheConfig {
  enabled: boolean;
  ttl: number;
}

export interface MCPValidationError {
  field: string;
  message: string;
}

export interface MCPValidationResult {
  isValid: boolean;
  errors?: MCPValidationError[];
}

export interface MCPSchemaConfig {
  strict: boolean;
  allowUnknown: boolean;
}

export interface MCPSchema<T> {
  validate(data: unknown): MCPValidationResult;
  transform(data: unknown): T;
} 