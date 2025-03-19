# TradeWizard Scraper Service Database Setup

This document contains instructions for setting up the database for the TradeWizard Scraper Service.

## Manual Database Setup

If the automatic setup script (`setup-database.js`) doesn't work, follow these manual steps to set up the database:

1. **Log in to your Supabase Dashboard**
   - Go to [app.supabase.com](https://app.supabase.com) and log in
   - Select your project

2. **Open the SQL Editor**
   - In the left sidebar, click on "SQL Editor"
   - Click "New Query" to create a new SQL query

3. **Copy the Schema SQL**
   - Open the `db/schema.sql` file in this repository
   - Copy the entire contents of the file

4. **Execute the SQL**
   - Paste the SQL into the Supabase SQL Editor
   - Click "Run" to execute the SQL statements
   - You should see confirmation that the commands were executed successfully

## Schema Overview

The database uses a simplified schema with the adapter pattern:

```sql
CREATE TABLE IF NOT EXISTS scraped_websites (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  data JSONB,
  status TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

This schema provides:
- A unique identifier (`id`)
- A way to look up data by URL (`url`)
- A JSONB column (`data`) for storing any data structure
- Status tracking (`status`)
- Timestamp for tracking when data was last updated (`scraped_at`)

## Adapter Pattern

The schema is designed to work with the adapter pattern, which provides a layer of abstraction between the application's data model and the database schema. This allows the application to work with rich, complex data structures while storing the data in a simplified database schema.

See `README-DATABASE-ADAPTER.md` for more details on the adapter pattern implementation.

## Verifying Setup

After setting up the database, you can verify that everything is working by running the adapter tests:

```bash
node test-adapter.js       # Tests the basic adapter
node test-advanced-adapter.js  # Tests the advanced adapter
```

These tests will create sample records, retrieve them, and verify that the data is preserved correctly through the adapter translation.

## Environment Variables

Make sure you have the following environment variables set in your `.env` file:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

You can find these values in your Supabase project settings under "API".

## Troubleshooting

If you encounter issues:

1. **Check Credentials**: Ensure your Supabase URL and service role key are correct.
2. **Check Permissions**: Make sure your service role has the necessary permissions to create tables.
3. **Manual Execution**: Try executing parts of the schema SQL manually to identify specific issues.
4. **Enable Extensions**: Some features might require extensions like `pg_stat_statements`, which you can enable in the Supabase dashboard under "Database" > "Extensions".

For additional help, refer to the Supabase documentation on [Database](https://supabase.com/docs/guides/database) and [Authentication](https://supabase.com/docs/guides/auth). 