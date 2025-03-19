# TradeWizard Scraper Service - Supabase Setup Guide

This guide walks you through setting up a Supabase instance for the TradeWizard Scraper Service.

## 1. Create a Supabase Project

1. Sign up or log in to [Supabase](https://supabase.com/)
2. Create a new project:
   - Click on "New project"
   - Name your project (e.g., "tradewizard-scraper")
   - Set a secure database password
   - Choose a region closest to your users
   - Select the free plan for development, or an appropriate paid plan for production
   - Click "Create new project"

3. Wait for your project to be created (usually takes 2-3 minutes)

## 2. Get Your Project Credentials

1. In your Supabase project dashboard, go to "Settings" (gear icon) > "API"
2. Under "Project API keys", find and copy:
   - **Project URL**: This is your `SUPABASE_URL`
   - **anon public**: This is your `SUPABASE_ANON_KEY`

3. Store these credentials securely for later use

## 3. Set Up the Database Schema

1. In your Supabase project dashboard, go to "SQL Editor"
2. Click "New query"
3. You have two options:

### Option A: Run the Setup Script

1. Upload the `tradewizard-scraper-service/db/schema.sql` file to the SQL Editor
2. Or paste the contents of the file into the editor
3. Click "Run" to execute the SQL script

### Option B: Run the Schema + RLS Setup Script

1. Upload the `tradewizard-scraper-service/db/setup_supabase.sql` file to the SQL Editor
2. Or paste the contents of the file into the editor
3. Click "Run" to execute the SQL script
   - This will create the tables and set up Row Level Security (RLS) policies

## 4. Configure Environment Variables

1. Open the `.env` file in the tradewizard-scraper-service directory
2. Update the Supabase configuration:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

Replace `your-project-id` and `your-supabase-anon-key` with the values you copied earlier.

## 5. Verify Setup

1. Start the scraper service:
```bash
cd tradewizard-scraper-service
npm install
node server.js
```

2. Test the database connection by accessing the health endpoint:
```bash
curl http://localhost:3002/health
```

You should see a response that includes database connectivity status.

## Database Schema Overview

The TradeWizard Scraper Service uses the following tables:

1. **scraped_websites**: Stores information about scraped websites
2. **website_products**: Stores products found on scraped websites
3. **scrape_jobs**: Tracks scraping jobs and their status
4. **api_usage_logs**: Monitors API usage for cost tracking

A view named **website_summaries** provides a convenient overview of website data.

## Row-Level Security (RLS)

The setup script configures appropriate RLS policies to secure your data:

- The service role has full access to all tables
- Anonymous users have read-only access to specific data

## Troubleshooting

If you encounter issues with the database setup:

1. **Connection errors**: Verify your Supabase URL and anon key are correct
2. **SQL errors**: Check if tables already exist before running the schema again
3. **Performance issues**: Consider adding indexes for frequently queried fields

For more help, refer to the [Supabase documentation](https://supabase.com/docs) or create an issue in the TradeWizard repository. 