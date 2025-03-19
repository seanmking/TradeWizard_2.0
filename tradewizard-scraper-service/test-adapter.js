/**
 * Test DB Adapter
 * Verifies the database adapter works correctly
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const dbAdapter = require('./db-adapter');

// Test URL
const testUrl = 'test-adapter.example.com';

/**
 * Generate sample rich data for testing
 */
function generateSampleData() {
  return {
    businessName: "Test Company",
    businessSize: "medium",
    description: "This is a test company for database adapter testing",
    foundedYear: 2020,
    employeeCount: 50,
    productCategories: ["software", "services"],
    productDetails: [
      { name: "Product A", description: "Description of Product A", category: "software" },
      { name: "Product B", description: "Description of Product B", category: "services" }
    ],
    customerSegments: ["enterprise", "government"],
    certifications: ["ISO 9001", "CMMI Level 3"],
    geographicPresence: ["North America", "Europe"],
    exportMarkets: ["Germany", "UK", "Japan"],
    exportReadiness: 85,
    strengths: ["Strong technical team", "Innovative products"],
    weaknesses: ["Limited marketing presence", "New to international markets"],
    recommendations: ["Expand marketing efforts", "Seek international partnerships"],
    customField1: "Custom Value 1",
    customField2: "Custom Value 2"
  };
}

async function runTest() {
  console.log("\n========================================");
  console.log("Testing Database Adapter");
  console.log("========================================\n");
  
  // Initialize Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }
  
  console.log('Initializing Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // First, clean up any existing test data
  console.log('\n=== Step 1: Cleaning up existing test data ===');
  const { error: deleteError } = await supabase
    .from('scraped_websites')
    .delete()
    .eq('url', testUrl);
    
  if (deleteError) {
    console.error('Error cleaning up test data:', deleteError);
  } else {
    console.log('Test data cleaned up successfully');
  }
  
  // Test storing data via adapter
  console.log('\n=== Step 2: Testing data storage via adapter ===');
  const testData = generateSampleData();
  console.log(`Generated test data with ${Object.keys(testData).length} fields`);
  
  const savedRecord = await dbAdapter.saveScrapedData(supabase, testUrl, testData);
  
  if (!savedRecord) {
    console.error('Failed to save test data');
    process.exit(1);
  }
  
  console.log('Data saved successfully:');
  console.log(`- ID: ${savedRecord.id}`);
  console.log(`- URL: ${savedRecord.url}`);
  console.log(`- Status: ${savedRecord.status}`);
  console.log(`- Data field size: ${JSON.stringify(savedRecord.data).length} characters`);
  
  // Test retrieving data via adapter
  console.log('\n=== Step 3: Testing data retrieval via adapter ===');
  const retrievedData = await dbAdapter.getScrapedData(supabase, testUrl);
  
  if (!retrievedData) {
    console.error('Failed to retrieve test data');
    process.exit(1);
  }
  
  console.log('Data retrieved successfully');
  console.log(`- Business Name: ${retrievedData.businessName}`);
  console.log(`- Export Readiness: ${retrievedData.exportReadiness}`);
  console.log(`- # of Products: ${retrievedData.productDetails.length}`);
  
  // Verify all original fields are preserved
  console.log('\n=== Step 4: Verifying data integrity ===');
  let allFieldsPreserved = true;
  const originalFields = Object.keys(testData);
  
  for (const field of originalFields) {
    // Deep comparison that ignores property order in objects
    const isEqual = function deepEqual(obj1, obj2) {
      if (obj1 === obj2) return true;
      if (typeof obj1 !== 'object' || obj1 === null || 
          typeof obj2 !== 'object' || obj2 === null) {
        return obj1 === obj2;
      }
      
      if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return false;
        for (let i = 0; i < obj1.length; i++) {
          if (!deepEqual(obj1[i], obj2[i])) return false;
        }
        return true;
      }
      
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      
      if (keys1.length !== keys2.length) return false;
      
      for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
      }
      
      return true;
    };
    
    if (!isEqual(retrievedData[field], testData[field])) {
      console.error(`Field mismatch in ${field}`);
      console.error(`Original: ${JSON.stringify(testData[field])}`);
      console.error(`Retrieved: ${JSON.stringify(retrievedData[field])}`);
      allFieldsPreserved = false;
    }
  }
  
  if (allFieldsPreserved) {
    console.log('All data fields preserved correctly through adapter translation');
  } else {
    console.error('Some data fields were not preserved correctly');
  }
  
  // Test updating data
  console.log('\n=== Step 5: Testing data update via adapter ===');
  const updatedData = {
    ...testData,
    businessName: "Updated Test Company",
    exportReadiness: 90,
    newField: "This field was added in an update"
  };
  
  const updatedRecord = await dbAdapter.saveScrapedData(supabase, testUrl, updatedData);
  
  if (!updatedRecord) {
    console.error('Failed to update test data');
  } else {
    console.log('Data updated successfully');
    
    // Verify update
    const retrievedUpdatedData = await dbAdapter.getScrapedData(supabase, testUrl);
    
    if (retrievedUpdatedData) {
      console.log(`- Updated Business Name: ${retrievedUpdatedData.businessName}`);
      console.log(`- Updated Export Readiness: ${retrievedUpdatedData.exportReadiness}`);
      console.log(`- New Field: ${retrievedUpdatedData.newField}`);
      
      if (retrievedUpdatedData.businessName === updatedData.businessName &&
          retrievedUpdatedData.exportReadiness === updatedData.exportReadiness &&
          retrievedUpdatedData.newField === updatedData.newField) {
        console.log('Update verification passed');
      } else {
        console.error('Update verification failed');
      }
    } else {
      console.error('Failed to retrieve updated data');
    }
  }
  
  console.log("\n========================================");
  console.log("Database Adapter Test Completed");
  console.log("========================================\n");
}

// Run the test
runTest(); 