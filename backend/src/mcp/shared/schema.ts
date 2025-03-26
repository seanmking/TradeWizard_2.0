import { z } from 'zod';
import type { MCPBaseResponse, MCPResponse, MCPValidationResult } from './types';

export type MCPBaseResponseSchema = z.ZodObject<{
  status: z.ZodNumber;
  message?: z.ZodOptional<z.ZodString>;
  metadata?: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}>;

export type MCPResponseSchema<T extends z.ZodTypeAny> = z.ZodObject<{
  status: z.ZodNumber;
  message?: z.ZodOptional<z.ZodString>;
  metadata?: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  data: z.ZodNullable<T>;
}>;

export function createBaseResponseSchema(): MCPBaseResponseSchema {
  return z.object({
    status: z.number(),
    message: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
  });
}

export function createResponseSchema<T extends z.ZodTypeAny>(dataSchema: T): MCPResponseSchema<T> {
  const baseSchema = createBaseResponseSchema();
  return baseSchema.extend({
    data: dataSchema.nullable()
  }) as MCPResponseSchema<T>;
}

export function validateSchema<T>(schema: z.ZodType<T>, data: unknown): MCPValidationResult {
  const result = schema.safeParse(data);
  if (result.success) {
    return { isValid: true };
  }
  return {
    isValid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
  };
}

export function transformData<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
} 