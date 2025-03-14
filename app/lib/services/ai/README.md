# TradeWizard AI Model Selection

This documentation describes the simplified model approach implemented in TradeWizard to optimize OpenAI API costs while maintaining quality of responses. The system uses GPT-3.5 as the default model and only uses GPT-4 for specific complex tasks.

## Key Components

### OpenAI Service
- Manages all interactions with the OpenAI API
- Uses a simple model selection strategy based on task type
- Handles error recovery and fallback mechanisms

### Conversation Manager
- Tracks user conversation history and context
- Implements token optimization by pruning old messages
- Preserves important context information for AI interactions

### Web Scraper Integration
- Extracts structured data from business websites
- Reduces token usage by providing pre-processed information

## Model Selection Strategy

The service uses a straightforward model selection approach:

- **GPT-3.5-Turbo** is used as the default model for most tasks, including:
  - Initial assessments
  - Export experience questions
  - Motivation analysis
  - Target market identification
  - Follow-up questions
  - Clarification requests

- **GPT-4** is only used for:
  - Website analysis (which requires advanced reasoning)
  - Final summaries and report generation

This approach balances cost efficiency with user experience, using the more powerful and expensive model only when it provides significant value.

### Benefits of This Approach

1. **Cost Efficiency**: Using GPT-3.5 for most interactions reduces operational costs significantly
2. **Faster Response Times**: GPT-3.5 typically has lower latency than GPT-4
3. **Simplified Logic**: A straightforward decision model reduces complexity and potential errors
4. **Consistent User Experience**: More predictable response patterns and times

## Web Scraper Integration

The web scraper service extracts structured business data from user websites:

1. Replaces raw HTML content with structured information
2. Reduces token usage by over 90% for website analysis
3. Provides consistent data formats for more reliable analysis

## Token Usage Optimizations

Additional strategies implemented to reduce token usage:

1. **Prompt Compression** - Removing redundant instructions and content
2. **Context Management** - Only including relevant context based on current stage
3. **Message History Limitation** - Keeping only recent and relevant messages

## Usage Example

```typescript
import { openAIService } from './ai';

// Get AI response using appropriate model based on task type
const response = await openAIService.getCompletion(
  messages,
  {}, // Default options
  'website_analysis', // Task type determines model selection
  false, // Whether structured data is available
  'user123' // User ID for usage tracking
);
```

## Configuration

The model selection logic can be customized by updating thresholds and parameters:

```typescript
// Update configuration
aiAssessmentService.updateModelSelectionConfig({
  complexityThresholds: {
    queryLength: {
      medium: 200, // Character threshold for medium complexity
      high: 500    // Character threshold for high complexity
    }
  },
  // Override models for specific task types
  taskTypeOverrides: {
    'website_analysis': 'gpt-3.5-turbo' 
  }
});
```

## Best Practices

1. Always provide structured data when available
2. Use task-specific endpoints for optimal model selection
3. Include required context but minimize unnecessary information
4. Monitor token usage to identify optimization opportunities
5. Periodically review model selection thresholds 