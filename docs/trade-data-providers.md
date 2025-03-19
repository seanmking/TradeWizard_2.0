# Trade Data Providers

## Overview
TradeWizard uses dynamic trade data providers to fetch real-time trade information from multiple sources.

## Supported Providers
- WITS (World Integrated Trade Solution)
- UN Comtrade

## Configuration
Create a `.env` file with the following:
```
WITS_API_KEY=your_wits_api_key
UN_COMTRADE_API_KEY=your_un_comtrade_api_key
```

## Usage Examples

### Fetching Export Partners
```typescript
const saExportPartners = await TradeDataProviderConfig.witsProvider.getExportPartners('ZAF', 2022);
```

### Fetching Trade Data
```typescript
const saTradeData = await TradeDataProviderConfig.unComtradeProvider.getCountryTradeData(
  TradeDataProviderConfig.getCountryCode('South Africa'),
  2022,
  'X'
);
```

## Error Handling
The providers include built-in error handling:
- Graceful fallback on API failures
- Logging of error details
- Configurable error responses

## Best Practices
- Always use `TradeDataProviderConfig` for provider access
- Utilize `safeDataFetch` for robust error management
- Cache results when possible
- Monitor API usage and costs

## Extending Providers
- Implement new providers by following the existing interface
- Add country code mappings in `getCountryCode`
- Enhance error handling and logging
