/**
 * Website Analysis Service
 * Handles validating and analyzing website URLs provided during the assessment.
 */

export interface WebsiteAnalysisResult {
  url: string;
  isValid: boolean;
  hasContactForm: boolean;
  hasExportInfo: boolean;
  hasProductCatalog: boolean;
  hasSocialMedia: boolean;
  insights: string[];
  error?: string;
}

/**
 * Validate a website URL
 */
export const validateWebsiteUrl = (url: string): boolean => {
  // Skip validation if user indicated they don't have a website
  if (
    !url || 
    url.toLowerCase().includes('no') || 
    url.toLowerCase().includes('none') || 
    url.toLowerCase().includes('not yet')
  ) {
    return true;
  }
  
  // Basic URL validation
  const urlPattern = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+)(\/[\w-.,@?^=%&:/~+#]*)*$/i;
  return urlPattern.test(url);
};

/**
 * Normalize a website URL (add protocol if missing)
 */
export const normalizeUrl = (url: string): string => {
  if (!url) return '';
  
  // Skip for "no website" responses
  if (
    url.toLowerCase().includes('no') || 
    url.toLowerCase().includes('none') || 
    url.toLowerCase().includes('not yet')
  ) {
    return url;
  }
  
  // Add https:// if no protocol is specified
  if (!url.match(/^https?:\/\//i)) {
    return `https://${url}`;
  }
  
  return url;
};

/**
 * Analyze a website for export readiness indicators
 * 
 * In a full implementation, this would call a backend API to perform actual
 * website analysis. For now, we'll simulate the analysis with a delay.
 */
export const analyzeWebsite = async (url: string): Promise<WebsiteAnalysisResult> => {
  // Skip analysis if user indicated they don't have a website
  if (
    !url || 
    url.toLowerCase().includes('no') || 
    url.toLowerCase().includes('none') || 
    url.toLowerCase().includes('not yet')
  ) {
    return {
      url: '',
      isValid: true,
      hasContactForm: false,
      hasExportInfo: false,
      hasProductCatalog: false,
      hasSocialMedia: false,
      insights: [
        "Creating a website would strengthen your online presence.",
        "Consider starting with a simple site showcasing your products and contact information."
      ]
    };
  }
  
  // Check URL validity
  if (!validateWebsiteUrl(url)) {
    return {
      url,
      isValid: false,
      hasContactForm: false,
      hasExportInfo: false,
      hasProductCatalog: false,
      hasSocialMedia: false,
      insights: [],
      error: "The provided URL appears to be invalid. Please check the format."
    };
  }
  
  // Normalize the URL
  const normalizedUrl = normalizeUrl(url);
  
  try {
    // Simulate API call with delay
    // In a real implementation, this would be an actual API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo purposes, generate random analysis results
    // In a real implementation, these would come from actual website analysis
    const hasContactForm = Math.random() > 0.4;
    const hasExportInfo = Math.random() > 0.7;
    const hasProductCatalog = Math.random() > 0.5;
    const hasSocialMedia = Math.random() > 0.3;
    
    // Generate insights based on analysis
    const insights: string[] = [];
    
    if (!hasContactForm) {
      insights.push("Adding a contact form would make it easier for international buyers to reach you.");
    }
    
    if (!hasExportInfo) {
      insights.push("Consider adding information about international shipping and export capabilities.");
    }
    
    if (!hasProductCatalog) {
      insights.push("A detailed product catalog would help international buyers understand your offerings.");
    }
    
    if (!hasSocialMedia) {
      insights.push("Linking to social media profiles could expand your international reach.");
    }
    
    return {
      url: normalizedUrl,
      isValid: true,
      hasContactForm,
      hasExportInfo,
      hasProductCatalog,
      hasSocialMedia,
      insights
    };
  } catch (error) {
    console.error('Error analyzing website:', error);
    return {
      url: normalizedUrl,
      isValid: true,
      hasContactForm: false,
      hasExportInfo: false,
      hasProductCatalog: false,
      hasSocialMedia: false,
      insights: ["Unable to analyze website fully. Consider reviewing your site's content for export readiness."],
      error: "An error occurred during website analysis."
    };
  }
}; 