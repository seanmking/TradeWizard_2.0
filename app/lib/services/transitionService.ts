/**
 * Transition Service
 * Handles data transition between anonymous assessment and registered user.
 */

import { loadAssessmentData, AssessmentData } from './assessmentService';

/**
 * Check if there's assessment data available to associate with a new account
 */
export const hasAssessmentDataToAssociate = (): boolean => {
  const data = loadAssessmentData();
  return data !== null;
};

/**
 * Get registration form pre-fill data from assessment data
 */
export const getRegistrationPrefillData = (): { firstName: string; lastName: string; businessName: string } => {
  const data = loadAssessmentData();
  
  if (!data) {
    return {
      firstName: '',
      lastName: '',
      businessName: '',
    };
  }
  
  return {
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    businessName: data.business_name || '',
  };
};

/**
 * Migrate assessment data to a user account
 * In a real implementation, this would call an API to associate the data with the user
 */
export const migrateAssessmentData = async (userId: string): Promise<boolean> => {
  const data = loadAssessmentData();
  
  if (!data) {
    return false;
  }
  
  try {
    // In a real implementation, this would call an API 
    // For now, we'll simulate this with a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate successful migration
    console.log(`Assessment data migrated to user ${userId}`, data);
    
    // Clear local storage data after migration
    localStorage.removeItem('initialAssessment');
    
    return true;
  } catch (error) {
    console.error('Error migrating assessment data:', error);
    return false;
  }
};

/**
 * Handle error recovery for failed migrations
 * @param userId The ID of the user to retry the migration for
 * @returns A promise that resolves when the recovery is complete
 */
export const recoverFailedMigration = async (userId: string): Promise<boolean> => {
  try {
    // In a real implementation, this would check for failed migrations in a
    // recovery queue and retry them
    // For now, we'll just retry the migration
    return await migrateAssessmentData(userId);
  } catch (error) {
    console.error('Error recovering failed migration:', error);
    return false;
  }
}; 