/**
 * Validation utilities
 */

import { RegulatoryRequirement } from '../types';
import { StandardDataStructures } from './data-standards';

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a regulatory requirement
 */
export function validateRegulatoryRequirement(
  requirement: RegulatoryRequirement
): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Required fields validation
  if (!requirement.country) {
    errors.push({
      field: 'country',
      message: 'Country is required'
    });
  }
  
  if (!requirement.productCategory) {
    errors.push({
      field: 'productCategory',
      message: 'Product category is required'
    });
  }
  
  if (!requirement.requirementType) {
    errors.push({
      field: 'requirementType',
      message: 'Requirement type is required'
    });
  }
  
  if (!requirement.description) {
    errors.push({
      field: 'description',
      message: 'Description is required'
    });
  }
  
  if (!requirement.agency) {
    errors.push({
      field: 'agency',
      message: 'Agency is required'
    });
  }
  
  // If agency is an object, validate its fields
  if (typeof requirement.agency === 'object') {
    if (!requirement.agency.name) {
      errors.push({
        field: 'agency.name',
        message: 'Agency name is required'
      });
    }
    
    if (!requirement.agency.country) {
      errors.push({
        field: 'agency.country',
        message: 'Agency country is required'
      });
    }
    
    if (requirement.agency.contactEmail && !isValidEmail(requirement.agency.contactEmail)) {
      errors.push({
        field: 'agency.contactEmail',
        message: 'Agency email is invalid'
      });
    }
    
    if (requirement.agency.website && !isValidUrl(requirement.agency.website)) {
      errors.push({
        field: 'agency.website',
        message: 'Agency website URL is invalid'
      });
    }
  }
  
  // Type validations
  if (requirement.frequency && 
      !['once-off', 'ongoing', 'periodic'].includes(requirement.frequency)) {
    errors.push({
      field: 'frequency',
      message: 'Frequency must be one of: once-off, ongoing, periodic'
    });
  }
  
  if (requirement.validationStatus && 
      !['verified', 'unverified', 'outdated'].includes(requirement.validationStatus)) {
    errors.push({
      field: 'validationStatus',
      message: 'Validation status must be one of: verified, unverified, outdated'
    });
  }
  
  if (requirement.lastVerifiedDate && !isValidDate(requirement.lastVerifiedDate)) {
    errors.push({
      field: 'lastVerifiedDate',
      message: 'Last verified date must be a valid date string'
    });
  }
  
  if (requirement.confidenceLevel !== undefined) {
    if (typeof requirement.confidenceLevel !== 'number' || 
        requirement.confidenceLevel < 0 || 
        requirement.confidenceLevel > 1) {
      errors.push({
        field: 'confidenceLevel',
        message: 'Confidence level must be a number between 0 and 1'
      });
    }
  }
  
  // If updateFrequency is defined, validate its fields
  if (requirement.updateFrequency) {
    if (!requirement.updateFrequency.recommendedSchedule) {
      errors.push({
        field: 'updateFrequency.recommendedSchedule',
        message: 'Update frequency recommended schedule is required'
      });
    }
    
    if (!Array.isArray(requirement.updateFrequency.sourcesToMonitor)) {
      errors.push({
        field: 'updateFrequency.sourcesToMonitor',
        message: 'Sources to monitor must be an array'
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Checks if a string is a valid email address
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Checks if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if a string is a valid date
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
} 