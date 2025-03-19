/**
 * Test Advanced Database Adapter
 * Tests the implementation of the developer's recommended adapter pattern
 */

require('dotenv').config();
const { createAdapter } = require('./advanced-db-adapter');

// Sample data
const testUrl = 'test-advanced.example.com';
const testData = {
  businessName: "Advanced Test Company",
  businessSize: "medium",
  description: "Testing the advanced adapter implementation",
  productDetails: [
    { name: "Product X", price: 299, category: "software" },
    { name: "Product Y", price: 599, category: "services" }
  ],
  exportReadiness: 75,
  strengths: ["Innovation", "Market knowledge"],
  recommendations: ["Focus on international expansion"],
  testTimestamp: new Date().toISOString()
};

/**
 * Run comprehensive tests on the advanced adapter
 */
async function runTests() {
  console.log("\n============================================");
  console.log("Testing Advanced Database Adapter");
  console.log("============================================\n");
  
  try {
    // Initialize the adapter
    console.log("Initializing adapter...");
    const adapter = createAdapter();
    
    // Clean up any existing test data
    console.log("\n=== Test 1: Delete any existing test data ===");
    const deleteResult = await adapter.deleteScrapedData(testUrl);
    console.log("Delete result:", deleteResult.success ? "Success" : "Failed", 
      deleteResult.error ? `(${deleteResult.error})` : "");
    
    // Test saving data
    console.log("\n=== Test 2: Save new data ===");
    const saveResult = await adapter.saveScrapedData(testUrl, testData);
    
    if (!saveResult.success) {
      console.error("Failed to save data:", saveResult.error);
      process.exit(1);
    }
    
    console.log("Data saved successfully");
    console.log("Record ID:", saveResult.data.id);
    console.log("URL:", saveResult.data.url);
    console.log("Status:", saveResult.data.status);
    console.log("Scraped at:", saveResult.data.scraped_at);
    
    // Test retrieving data
    console.log("\n=== Test 3: Retrieve data ===");
    const getResult = await adapter.getScrapedData(testUrl);
    
    if (!getResult.success) {
      console.error("Failed to retrieve data:", getResult.error);
      process.exit(1);
    }
    
    console.log("Data retrieved successfully");
    console.log("Business name:", getResult.data.businessName);
    console.log("Export readiness:", getResult.data.exportReadiness);
    console.log("Products:", getResult.data.productDetails.length);
    console.log("Metadata ID:", getResult.metadata.id);
    console.log("Metadata URL:", getResult.metadata.url);
    console.log("Metadata Status:", getResult.metadata.status);
    
    // Verify data integrity
    console.log("\n=== Test 4: Verify data integrity ===");
    const originalBusinessName = testData.businessName;
    const retrievedBusinessName = getResult.data.businessName;
    
    if (originalBusinessName === retrievedBusinessName) {
      console.log("✓ Business name matches");
    } else {
      console.error("✗ Business name mismatch");
      console.log(`  Original: ${originalBusinessName}`);
      console.log(`  Retrieved: ${retrievedBusinessName}`);
    }
    
    const originalProductCount = testData.productDetails.length;
    const retrievedProductCount = getResult.data.productDetails.length;
    
    if (originalProductCount === retrievedProductCount) {
      console.log("✓ Product count matches");
    } else {
      console.error("✗ Product count mismatch");
    }
    
    // Test updating status
    console.log("\n=== Test 5: Update status ===");
    const updateResult = await adapter.updateStatus(testUrl, "processed");
    
    if (!updateResult.success) {
      console.error("Failed to update status:", updateResult.error);
    } else {
      console.log("Status updated successfully to:", updateResult.data.status);
    }
    
    // Test list websites
    console.log("\n=== Test 6: List websites ===");
    const listResult = await adapter.listScrapedWebsites();
    
    if (!listResult.success) {
      console.error("Failed to list websites:", listResult.error);
    } else {
      console.log(`Found ${listResult.data.length} websites in the database:`);
      
      listResult.data.forEach((site, index) => {
        console.log(`${index + 1}. ${site.url} (${site.status}) - ID: ${site.id}`);
        if (site.businessData && site.businessData.businessName) {
          console.log(`   Business: ${site.businessData.businessName}`);
        }
      });
    }
    
    // Test filtering by status
    console.log("\n=== Test 7: Filter websites by status ===");
    const filteredResult = await adapter.listScrapedWebsites("processed");
    
    if (!filteredResult.success) {
      console.error("Failed to filter websites:", filteredResult.error);
    } else {
      console.log(`Found ${filteredResult.data.length} websites with status 'processed'`);
    }
    
    // Test update (upsert) with new data
    console.log("\n=== Test 8: Update existing record ===");
    const updatedData = {
      ...testData,
      businessName: "Updated Advanced Company",
      exportReadiness: 90,
      updatedAt: new Date().toISOString(),
      newField: "This field was added in the update"
    };
    
    const updateDataResult = await adapter.saveScrapedData(testUrl, updatedData);
    
    if (!updateDataResult.success) {
      console.error("Failed to update data:", updateDataResult.error);
    } else {
      console.log("Data updated successfully");
      
      // Verify updated data
      const verifyResult = await adapter.getScrapedData(testUrl);
      
      if (verifyResult.success) {
        console.log("Retrieved updated record:");
        console.log("- Updated business name:", verifyResult.data.businessName);
        console.log("- Updated export readiness:", verifyResult.data.exportReadiness);
        console.log("- New field value:", verifyResult.data.newField);
      }
    }
    
    console.log("\n============================================");
    console.log("Advanced Database Adapter Test Completed");
    console.log("============================================");
  } catch (error) {
    console.error("Error during test:", error.message);
    process.exit(1);
  }
}

// Run the tests
runTests(); 