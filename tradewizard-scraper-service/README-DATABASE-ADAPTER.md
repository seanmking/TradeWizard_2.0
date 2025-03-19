# TradeWizard Scraper Service Database Adapter

This document describes the database adapter pattern implemented in the TradeWizard Scraper Service for interfacing with Supabase.

## Overview

The database adapter pattern provides a layer of abstraction between the application's data model and the database schema. This separation allows the application to work with rich, complex data structures while storing the data in a simplified database schema.

### Key Benefits

- **Simplified Database Schema**: Stores complex data in a JSONB column, reducing the need for multiple tables
- **Schema Flexibility**: Allows the application to evolve without requiring database schema changes
- **Transparent Data Access**: Application code can work with rich objects without knowledge of the storage details
- **Progressive Enhancement**: Adapter can be refined as requirements evolve

## Implementation

The TradeWizard Scraper Service uses the following schema for the `scraped_websites` table:

```sql
CREATE TABLE scraped_websites (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  data JSONB,
  status TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

This simple schema provides:
- A unique identifier
- A way to look up data by URL
- A JSONB column for storing any data structure
- Status tracking
- Timestamp for tracking when data was last updated

## Usage

### Basic Adapter

The basic adapter (`db-adapter.js`) provides simple functions for translating between application models and database records:

```javascript
// Store data through the adapter
const savedRecord = await dbAdapter.saveScrapedData(supabase, url, scrapedData);

// Retrieve data through the adapter
const adaptedModel = await dbAdapter.getScrapedData(supabase, url);
```

### Advanced Adapter

The advanced adapter (`advanced-db-adapter.js`) provides a more complete implementation with:

- Factory pattern for creating adapter instances
- Support for listing and filtering records
- Status updates
- Error handling and logging
- Data deletion

```javascript
// Create adapter instance
const adapter = createAdapter();

// Save complex data
await adapter.saveScrapedData(url, complexData);

// Get data with metadata
const result = await adapter.getScrapedData(url);
if (result.success) {
  const businessData = result.data;
  const metadata = result.metadata;
}

// List all websites
const listResult = await adapter.listScrapedWebsites();
```

## Integration Examples

The repository includes several examples of how to use the database adapter:

1. **Basic Integration**: `scraper-with-adapter.js` - Simple example of using the adapter with the scraper
2. **Advanced Integration**: `advanced-scraper-integration.js` - Comprehensive example with caching, options, and error handling
3. **Tests**: `test-adapter.js` and `test-advanced-adapter.js` - Tests to verify adapter functionality

## When to Use

This adapter pattern is particularly useful when:

- The data you're working with has a complex structure
- The schema might evolve over time
- You need to minimize database schema changes
- You want to keep your application code clean and decoupled from storage details

## Limitations

- Complex queries on nested data may require specialized JSONB queries
- No referential integrity for data within the JSONB column
- Performance considerations for very large JSONB objects

## Future Enhancements

Possible enhancements to the adapter pattern could include:

1. Adding indexes on commonly queried JSONB fields
2. Implementing data validation at the adapter level
3. Supporting partial updates to avoid overwriting the entire data structure
4. Adding versioning support for schema changes

## Tests

Two test files demonstrate and verify the adapter functionality:

1. `test-adapter.js` - Tests the basic adapter functionality
2. `test-advanced-adapter.js` - Tests the advanced adapter implementation

Run the tests with:
```
node test-adapter.js
node test-advanced-adapter.js
``` 