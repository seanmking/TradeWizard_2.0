/**
 * Check if a string is a valid URL
 * @param url - String to validate as URL
 * @returns Boolean indicating if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    // Must start with http:// or https://
    if (!url.match(/^https?:\/\//i)) {
      return false;
    }
    
    const urlObj = new URL(url);
    
    // Must have a valid hostname
    if (!urlObj.hostname) {
      return false;
    }
    
    // Hostname must have at least one dot (e.g., example.com)
    if (!urlObj.hostname.includes('.')) {
      return false;
    }
    
    // Check TLD length is reasonable
    const parts = urlObj.hostname.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2 || tld.length > 12) {
      return false;
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a string is a valid email address
 * @param email - String to validate as email
 * @returns Boolean indicating if the email is valid
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

/**
 * Check if a string is a valid phone number
 * @param phone - String to validate as phone number
 * @returns Boolean indicating if the phone is valid
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check length is reasonable (varies by country)
  return cleanPhone.length >= 7 && cleanPhone.length <= 15;
}

/**
 * Sanitize a string by removing HTML/script tags
 * @param text - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Remove HTML tags
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}
