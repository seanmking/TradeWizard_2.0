# TradeWizard Scraper Service - OpenAI API Setup Guide

This guide walks you through setting up a valid OpenAI API key for the TradeWizard Scraper Service and managing API usage effectively.

## 1. Create an OpenAI Account

1. Go to [OpenAI's platform](https://platform.openai.com/)
2. Click "Sign Up" or "Log In" if you already have an account
3. Complete the registration process if needed

## 2. Get an API Key

1. Log in to the [OpenAI platform](https://platform.openai.com/)
2. Go to your profile icon in the top-right corner and select "API keys"
3. Click "Create new secret key"
4. Give your key a name (e.g., "TradeWizard Scraper Service")
5. Copy the API key immediately (you won't be able to see it again)
6. Store this key securely for later use

## 3. Set Up Usage Limits (Recommended)

To prevent unexpected costs:

1. Go to "Settings" > "Usage limits" in the OpenAI dashboard
2. Set up a spending limit that matches your budget
3. Configure usage alerts for proactive notifications
4. Consider setting a "hard limit" that cannot be exceeded

## 4. Configure Environment Variables

1. Open the `.env` file in the tradewizard-scraper-service directory
2. Update the OpenAI configuration:

```
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

Replace `sk-your-openai-api-key` with your actual API key.

## 5. Choose the Right Model

The TradeWizard Scraper Service works with various OpenAI models. Choose the one that balances cost and performance for your needs:

| Model | Capabilities | Price (approx.) | Recommendation |
|-------|-------------|----------------|----------------|
| gpt-4o | Most capable, multimodal | $5-15/1M tokens | For production with premium results |
| gpt-4o-mini | Strong capabilities, lower cost | $0.50-1.50/1M tokens | Good balance for most use cases |
| gpt-3.5-turbo | Basic capabilities | $0.50/1M tokens | For development or high-volume scraping |

Set your chosen model in the `.env` file.

## 6. Verify API Key Setup

1. Start the scraper service:
```bash
cd tradewizard-scraper-service
npm install
node server.js
```

2. Test with a simple scrape:
```bash
curl "http://localhost:3002/scrape?url=example.com&maxPages=1"
```

## 7. Monitor API Usage

The TradeWizard Scraper Service automatically logs API usage to the Supabase database. You can:

1. Monitor usage through the OpenAI dashboard
2. View the `api_usage_logs` table in Supabase
3. Use the `/stats` endpoint of the scraper service to get usage metrics

## Cost Management Best Practices

1. **Use caching**: Set appropriate cache durations to avoid redundant API calls
   - The service automatically caches results for 24 hours by default
   - Configure different cache durations in the client code based on your needs

2. **Limit text input**: The service automatically trims large inputs to reduce token usage
   - Consider further optimizing the amount of text sent to the API

3. **Use lower-cost models for development**:
   - Set `OPENAI_MODEL=gpt-3.5-turbo` during development
   - Switch to more advanced models for production

4. **Implement fallback mechanisms**:
   - The service automatically falls back to cached data if API calls fail
   - Consider implementing additional fallback logic for critical workflows

## Troubleshooting

If you encounter issues with the OpenAI API:

1. **Authentication errors**: Verify your API key is correctly configured
2. **Rate limiting**: Implement retries with exponential backoff (already included in the service)
3. **Context length errors**: Reduce the amount of text being sent to the API
4. **High costs**: Review your usage patterns and optimize as needed

For more help, refer to the [OpenAI API documentation](https://platform.openai.com/docs/api-reference) or create an issue in the TradeWizard repository. 