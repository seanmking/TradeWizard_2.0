# API Response Standards

This document outlines the standardized response structure used throughout the TradeWizard platform. Following these standards ensures consistency, type safety, and proper error handling across all API endpoints.

## Response Structure

All API responses follow a standardized structure that includes data, metadata, and optional messages:

```typescript
interface ApiResponse<T> {
  status: number;
  data: T;
  message?: string;
  metadata: ResponseMetadata;
}
```

### Success Response

A successful response includes:
- HTTP status code (200, 201, etc.)
- The actual response data
- Metadata including source, timestamp, and data completeness
- Optional contextual message

Example:
```json
{
  "status": 200,
  "data": {
    "import_value_usd": 5000000000,
    "export_value_usd": 3000000000,
    "growth_rate": 12.5,
    "top_exporters": [
      {"country": "China", "market_share": 35},
      {"country": "Germany", "market_share": 15}
    ]
  },
  "metadata": {
    "data_completeness": "complete",
    "last_updated": "2025-03-27T05:06:02.741Z",
    "source": "WITS API",
    "confidence_score": 0.95
  }
}
```

### Error Response

Error responses follow a consistent structure:
- HTTP status code (400, 404, 500, etc.)
- `null` data field
- Error message
- Error code for programmatic handling
- Optional details for debugging
- Metadata with error context

Example:
```json
{
  "status": 400,
  "data": null,
  "message": "Invalid request: Missing or malformed HS code",
  "error_code": "VALIDATION_ERROR",
  "details": {
    "field": "hs_code",
    "required": true,
    "received": ""
  },
  "metadata": {
    "data_completeness": "incomplete",
    "last_updated": "2025-03-27T05:06:02.741Z",
    "source": "Error"
  }
}
```

## Metadata Structure

Every response includes metadata that provides context about the response:

```typescript
interface ResponseMetadata {
  data_completeness: 'complete' | 'partial' | 'incomplete';
  last_updated: string; // ISO timestamp
  source: string;
  confidence_score?: number;
}
```

- **data_completeness**: Indicates whether the response contains all, some, or none of the requested data
- **last_updated**: ISO timestamp when the data was last updated
- **source**: Origin of the data (API name, Cache, Database, etc.)
- **confidence_score**: Optional value (0-1) indicating reliability of the data

## Error Types and Status Codes

TradeWizard uses consistent HTTP status codes for specific error types:

| Error Type | Status Code | Description |
|------------|-------------|-------------|
| ValidationError | 400 | Invalid request parameters or payload |
| UnauthorizedError | 401 | Authentication required or token invalid |
| ForbiddenError | 403 | Permission denied for this resource |
| NotFoundError | 404 | Requested resource not found |
| InternalServerError | 500 | Unexpected server error |
| ExternalApiError | 502 | External API unavailable or error |
| ServiceUnavailableError | 503 | Service temporarily unavailable |

## Response Utilities

The platform provides utility functions for creating consistent responses:

```typescript
// Create standard success response
createSuccessResponse(data, {
  status: 200,
  message: "Optional message",
  metadata: { source: "WITS API" }
});

// Create response with partial data
createPartialResponse(data, {
  metadata: { confidence_score: 0.7 }
});

// Create response from cached data
createCachedResponse(data, cachedTimestamp, {
  metadata: { source: "Cache" }
});
```

## Market Intelligence Response Types

Market Intelligence endpoints return standardized response types:

### Trade Flow Response

```typescript
interface TradeFlowData {
  import_value_usd: number;
  export_value_usd: number;
  growth_rate: number;
  top_exporters: Array<{
    country: string;
    market_share: number;
  }>;
  import_volume?: number;
}
```

### Tariff Response

```typescript
interface TariffData {
  tariff_rate: number;
  quota_restrictions: string | null;
  trade_agreements: Array<{
    name: string;
    benefits: string;
  }>;
}
```

### Market Size Response

```typescript
interface MarketSizeData {
  market_value_usd: string;
  growth_rate: string;
  popular_categories: string[];
}
```

## Implementation Guidelines

1. **Always use utility functions** for creating responses
2. **Never return raw data** without following the response structure
3. **Use appropriate error types** for specific error conditions
4. **Include metadata** with every response
5. **Validate response structure** against the defined interfaces

## Testing Responses

Tests should verify:
1. Response structure compliance
2. Proper metadata fields
3. Appropriate status codes
4. Type safety for data payloads
5. Error handling and status code consistency

Example test:
```typescript
expect(response).toMatchObject({
  status: 200,
  data: {
    import_value_usd: expect.any(Number),
    export_value_usd: expect.any(Number),
    growth_rate: expect.any(Number),
    top_exporters: expect.any(Array)
  },
  metadata: {
    data_completeness: expect.stringMatching(/complete|partial|incomplete/),
    last_updated: expect.any(String),
    source: expect.any(String)
  }
});
```

By following these standards, TradeWizard maintains consistent, type-safe, and informative API responses across all endpoints.
