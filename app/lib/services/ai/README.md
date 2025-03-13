# TradeWizard Hybrid AI Model Selection

This documentation describes the hybrid model approach implemented in TradeWizard to optimize OpenAI API costs while maintaining quality of responses. The system intelligently selects between GPT-4 and GPT-3.5 Turbo models based on task complexity, structured data availability, and interaction type.

## Key Components

### OpenAI Service
- Manages all interactions with the OpenAI API
- Implements model selection based on complexity and task type
- Handles error recovery and fallback mechanisms

### Conversation Manager
- Tracks user conversation history and context
- Implements token optimization by pruning old messages
- Preserves important context information for AI interactions

### Prompt Templates
- Structured prompts for different assessment stages
- Dynamically generated based on user context
- Optimized for token efficiency

### Web Scraper Integration
- Extracts structured data from business websites
- Reduces token usage by providing pre-processed information
- Enables downgrading to cheaper models for many interactions

## Hybrid Model Approach

The service intelligently selects the appropriate OpenAI model based on:

1. **Task Complexity** - Analyzes user queries to determine complexity level
2. **Data Availability** - Uses cheaper models when structured data is available
3. **Task Type** - Maps assessment stages to specific task types with different requirements

### Model Selection Strategy

| Task Type | Complexity | With Structured Data | Without Structured Data |
|-----------|------------|----------------------|-------------------------|
| Website Analysis | High | GPT-3.5 Turbo | GPT-4 Turbo |
| Export Assessment | High | GPT-4 Turbo | GPT-4 Turbo |
| Export Assessment | Medium | GPT-3.5 Turbo | GPT-3.5 Turbo |
| Export Assessment | Low | GPT-3.5 Turbo | GPT-3.5 Turbo |
| Summary/Scoring | High | GPT-4 Turbo | GPT-4 Turbo |
| Clarifications | Low | GPT-3.5 Turbo | GPT-3.5 Turbo |
| Follow-up Questions | Low | GPT-3.5 Turbo | GPT-3.5 Turbo |

### Complexity Detection

The system determines query complexity using multiple factors:

1. **Query Length** - Longer queries typically require more processing power
2. **Industry Terminology** - Presence of export/industry-specific terms
3. **Cross-Reference Requirements** - Queries requiring synthesis of multiple pieces of information

## Web Scraper Integration

The web scraper service extracts structured business data from user websites:

1. Replaces raw HTML content with structured information
2. Reduces token usage by over 90% for website analysis
3. Enables using GPT-3.5 Turbo for tasks that would otherwise require GPT-4

## Token Usage Optimizations

Additional strategies implemented to reduce token usage:

1. **Prompt Compression** - Removing redundant instructions and content
2. **Context Management** - Only including relevant context based on current stage
3. **Message History Limitation** - Keeping only recent and relevant messages
4. **Dynamic Responses** - Shorter responses for simpler questions
5. **Fallback Mechanisms** - Graceful handling of API failures

## Estimated Cost Savings

| Assessment Component | Before Optimization | After Hybrid Approach | Savings |
|----------------------|---------------------|----------------------|---------|
| Website Analysis | ~15,000 tokens | ~1,500 tokens | ~90% |
| User Interactions | All GPT-4 | 70% GPT-3.5, 30% GPT-4 | ~60% |
| Context Management | Full history | Optimized history | ~40% |
| Total Cost | 100% | ~30% | ~70% |

## Usage Example

```typescript
import { openAIService, TaskType } from './ai';

// Select model based on task complexity
const taskType: TaskType = 'website_analysis';
const userQuery = "Tell me about my export readiness";
const hasStructuredData = true;

// Get appropriate model
const model = openAIService.selectModelForTask(
  taskType,
  userQuery,
  hasStructuredData
);

// Log the selected model
console.log(`Using ${model} for ${taskType}`);

// Get AI response using selected model
const response = await openAIService.getCompletion(
  messages,
  { model },
  taskType,
  hasStructuredData
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