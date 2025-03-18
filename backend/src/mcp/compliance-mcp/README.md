# Compliance MCP (Model Context Protocol)

The Compliance MCP is a specialized data layer in the TradeWizard platform dedicated to providing comprehensive compliance-related information for international trade. This MCP serves as a structured interface for accessing export requirements, tariff information, industry regulations, and compliance costs.

## Overview

The Compliance MCP aggregates data from multiple sources including:

- Regulatory databases like WITS (World Integrated Trade Solution)
- UN Comtrade international trade statistics
- TradeMap data
- Web-scraped regulatory information from official government websites

The MCP provides a unified API to access this information in a standardized format, with caching for improved performance.

## Features

- **Export Requirements**: Detailed compliance requirements for exporting to specific countries
- **Tariff Information**: Up-to-date tariff rates for different products and countries
- **Industry Regulations**: Regulatory frameworks for various industries
- **Compliance Cost Calculation**: Estimation of compliance costs for specific exports
- **Regulatory Monitoring**: Monitoring of regulatory websites for updates

## API Endpoints

### Health Check and Debug

- `GET /api/compliance/health`: Check the health status of the Compliance MCP
- `GET /api/compliance/debug/tables`: List available data tables
- `GET /api/compliance/debug/query/:query`: Run a raw query on Comtrade
- `POST /api/compliance/debug/clear-cache`: Clear the cache

### Export Requirements

- `GET /api/compliance/export-requirements/:country/:industry`: Get export requirements for a country and industry
- `GET /api/compliance/export-requirements/by-hs-code/:country/:hsCode`: Get requirements by HS code
- `POST /api/compliance/export-requirements`: Create a new export requirement
- `PUT /api/compliance/export-requirements/:id`: Update an existing requirement
- `DELETE /api/compliance/export-requirements/:id`: Delete a requirement

### Certification and Documentation

- `GET /api/compliance/certifications/:country/:sector/:subsector`: Get required certifications
- `GET /api/compliance/documentation/:country/:sector/:subsector`: Get required documentation
- `GET /api/compliance/subsector-requirements/:country/:sector/:subsector`: Get specialized subsector requirements
- `GET /api/compliance/requirement-details/:id`: Get detailed information about a specific requirement

### Regulatory Information

- `GET /api/compliance/regulatory-sources/:country/:sector`: Get regulatory authorities
- `GET /api/compliance/non-tariff-measures/:country/:hsCode`: Get non-tariff measures
- `GET /api/compliance/regulatory-updates`: Check for updates to regulatory sources

### Tariffs

- `GET /api/compliance/tariffs/:country/:hsCode`: Get tariff information for a product in a country
- `GET /api/compliance/tariffs/comparison/:hsCode`: Compare tariffs across countries
- `POST /api/compliance/tariffs`: Create or update tariff data

### Industry Classification

- `GET /api/compliance/sa-industry-classifications`: Get all SA industry classifications
- `GET /api/compliance/sa-industry-classifications/:id`: Get a specific classification
- `GET /api/compliance/hs-code-to-industry/:hsCode`: Map an HS code to an industry
- `GET /api/compliance/industry-regulations/:industry`: Get regulations for an industry

### Cost Calculator

- `GET /api/compliance/calculate-costs/:country/:hsCode`: Calculate compliance costs

## Data Structure

### Export Requirements

The core data structure for compliance requirements includes:

```typescript
{
  id: number;
  country_code: string;
  sector: string;
  subsector: string;
  hs_code: string;
  certification_required: string[];
  documentation_required: string[];
  tariff_rate: number;
  labeling_requirements: string;
  shelf_life_restrictions: number;
  ingredient_restrictions: string;
  compliance_notes: string;
  special_subsector_requirements: string;
  minimum_order_quantity: string;
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  regulatory_authority: string;
  regulatory_reference: string;
  official_source_url: string;
  last_official_update: string;
  verification_method: string;
}
```

## Data Sources

The Compliance MCP integrates data from multiple sources:

1. **Supabase Database**: Primary storage for structured export requirements data
2. **WITS API**: For tariff data and non-tariff measures
3. **UN Comtrade API**: For international trade statistics
4. **Web Scraping**: For regulatory information from official government websites
5. **In-memory Cache**: For performance optimization

## Regulatory Monitoring

The MCP includes a regulatory monitoring system that:

1. Stores information about regulatory authorities and their websites
2. Periodically checks these websites for updates
3. Flags potential regulatory changes

## Caching Strategy

The Compliance MCP implements a multi-level caching strategy:

1. **In-memory Cache**: For frequently accessed data (TTL: 1 hour)
2. **Request Deduplication**: Prevents duplicate API calls during high traffic
3. **Stale-while-revalidate**: Serves stale data while refreshing in the background

## Usage Examples

### Getting Export Requirements

```typescript
// Get export requirements for exporting textiles to UAE
fetch('/api/compliance/export-requirements/UAE/Textile')
  .then(response => response.json())
  .then(data => console.log(data));

// Get requirements for a specific HS code
fetch('/api/compliance/export-requirements/by-hs-code/USA/5201')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Getting Certification Requirements

```typescript
// Get required certifications for food products in the UAE
fetch('/api/compliance/certifications/UAE/Food Products/Processed Foods')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Calculating Compliance Costs

```typescript
// Calculate compliance costs for exporting to the USA
fetch('/api/compliance/calculate-costs/USA/5201')
  .then(response => response.json())
  .then(data => console.log(data));
```

## Implementation Notes

- All endpoints return JSON with a consistent format including `status` and `data` fields
- Error responses include `status: 'error'`, `code`, and `message` fields
- Response times are optimized through caching and efficient data fetching strategies 