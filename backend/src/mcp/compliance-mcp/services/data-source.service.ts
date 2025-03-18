import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';
import { ComplianceRequirement, RegulatorySource } from '../models/requirement.model';
import { setupWitsConnector } from '../../market-intelligence-mcp/connectors/wits';
import { cacheService } from './cache.service';

// Import existing services
const comtradeService = require('../../../services/comtradeService');

dotenv.config();

// Check if we're in test mode
const isTestMode = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test';

// Initialize Supabase client (only if not in test mode)
const supabase = !isTestMode ? createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) : null;

// Setup WITS connector
const witsConnector = setupWitsConnector({
  apiKey: process.env.WITS_API_KEY || 'test-key',
  baseUrl: process.env.WITS_API_URL || 'https://wits.worldbank.org/API/V1'
});

// Mock data for test mode - now with typed objects that match our interfaces
const mockData = {
  countries: [
    { id: 1, code: 'ZAF', name: 'South Africa', region: 'Africa' },
    { id: 2, code: 'USA', name: 'United States', region: 'North America' },
    { id: 3, code: 'EU', name: 'European Union', region: 'Europe' },
    { id: 4, code: 'CHN', name: 'China', region: 'Asia' },
    { id: 5, code: 'UAE', name: 'United Arab Emirates', region: 'Middle East' },
    { id: 6, code: 'UK', name: 'United Kingdom', region: 'Europe' }
  ],
  hsCodes: [
    { id: 1, code: '5201', description: 'Cotton, not carded or combed', category: 'Textiles' },
    { id: 2, code: '8703', description: 'Motor cars for transport of persons', category: 'Vehicles' },
    { id: 3, code: '0901', description: 'Coffee, whether or not roasted', category: 'Food' },
    { id: 4, code: '1902', description: 'Pasta', category: 'Food Products' },
    { id: 5, code: '2201', description: 'Waters, including natural or artificial mineral waters', category: 'Beverages' },
    { id: 6, code: '0804', description: 'Dates, figs, pineapples, avocados, guavas, mangoes', category: 'Fresh Produce' },
    { id: 7, code: '2202', description: 'Waters, including mineral waters and aerated waters, with sugar', category: 'Beverages' },
    { id: 8, code: '6204', description: 'Women\'s or girls\' suits, ensembles, jackets, blazers', category: 'Apparel' },
    { id: 9, code: '6302', description: 'Bed linen, table linen, toilet linen and kitchen linen', category: 'Home Textiles' },
    { id: 10, code: '3304', description: 'Beauty or make-up preparations and preparations for skin care', category: 'Beauty Products' }
  ],
  export_requirements: [
    {
      id: 1,
      country_code: 'UAE',
      country_name: 'United Arab Emirates',
      sector: 'Textile',
      subsector: 'Clothing',
      hs_code: '6104',
      industry: 'Textile',
      requirement_name: 'UAE Quality Conformity Certification',
      requirement_description: 'Textile products require UAE.S GSO 1956 certification for import into UAE',
      description: 'Textile products require UAE.S GSO 1956 certification for import into UAE',
      required: true,
      certification_required: ['UAE.S GSO 1956', 'Emirates Conformity Assessment System (ECAS)'],
      documentation_required: ['Certificate of Origin', 'Conformity Certificate', 'Commercial Invoice'],
      regulatory_authority: 'Emirates Authority for Standardization and Metrology (ESMA)',
      regulation_url: 'https://www.esma.gov.ae/en-us',
      special_subsector_requirements: 'Children\'s clothing requires additional safety certification'
    },
    {
      id: 2,
      country_code: 'UAE',
      country_name: 'United Arab Emirates',
      sector: 'Textile',
      subsector: 'Carpets',
      hs_code: '5701',
      industry: 'Textile',
      requirement_name: 'UAE Fire Safety Standards',
      requirement_description: 'Carpets and floor coverings must meet fire safety standards',
      description: 'Carpets and floor coverings must meet fire safety standards',
      required: true,
      certification_required: ['UAE Fire and Life Safety Code of Practice'],
      documentation_required: ['Fire Test Certificate', 'Certificate of Origin', 'Commercial Invoice'],
      regulatory_authority: 'UAE Civil Defence',
      regulation_url: 'https://www.dcd.gov.ae/en',
      special_subsector_requirements: 'Carpets for commercial use require additional flame resistance testing'
    },
    {
      id: 3,
      country_code: 'USA',
      country_name: 'United States of America',
      sector: 'Food',
      subsector: 'Processed Food',
      hs_code: '1904',
      industry: 'Food',
      requirement_name: 'FDA Food Facility Registration',
      requirement_description: 'Food facilities must register with the FDA before exporting to the USA',
      description: 'Food facilities must register with the FDA before exporting to the USA',
      required: true,
      certification_required: ['FDA Registration Number'],
      documentation_required: ['Prior Notice', 'Food Facility Registration', 'Commercial Invoice'],
      regulatory_authority: 'Food and Drug Administration (FDA)',
      regulation_url: 'https://www.fda.gov/food',
      special_subsector_requirements: 'Products containing meat require USDA inspection'
    }
  ],
  regulatory_sources: [
    {
      id: 1,
      country_code: 'UAE',
      sector: 'Food Products',
      authority_name: 'Emirates Authority for Standardization & Metrology (ESMA)',
      official_website: 'https://www.esma.gov.ae',
      contact_information: 'info@esma.gov.ae, +971 600565554',
      regulatory_framework: 'UAE Food Safety Law',
      last_checked: '2023-06-15',
      has_updates: false
    },
    {
      id: 2,
      country_code: 'USA',
      sector: 'Food Products',
      authority_name: 'Food and Drug Administration (FDA)',
      official_website: 'https://www.fda.gov',
      contact_information: 'industry@fda.gov, 1-888-463-6332',
      regulatory_framework: 'Food Safety Modernization Act',
      last_checked: '2023-06-20',
      has_updates: true
    }
  ],
  tables: [
    { table_name: 'countries' },
    { table_name: 'hs_codes' },
    { table_name: 'requirements' },
    { table_name: 'tariffs' },
    { table_name: 'export_requirements' },
    { table_name: 'regulatory_sources' }
  ],
  regulatory_authorities: [
    {
      id: 1,
      country_code: 'UAE',
      name: 'Emirates Authority for Standardization and Metrology (ESMA)',
      sector: 'Textile',
      website: 'https://www.esma.gov.ae/en-us',
      contact_email: 'info@esma.gov.ae',
      contact_phone: '+971 600565554',
      last_checked: '2023-05-01'
    },
    {
      id: 2,
      country_code: 'UAE',
      name: 'UAE Civil Defence',
      sector: 'Textile',
      website: 'https://www.dcd.gov.ae/en',
      contact_email: 'info@dcd.gov.ae',
      contact_phone: '+971 24194588',
      last_checked: '2023-05-01'
    },
    {
      id: 3,
      country_code: 'USA',
      name: 'Food and Drug Administration (FDA)',
      sector: 'Food',
      website: 'https://www.fda.gov/food',
      contact_email: 'industry@fda.gov',
      contact_phone: '+1 888-463-6332',
      last_checked: '2023-04-20'
    }
  ],
  non_tariff_measures: [
    {
      id: 1,
      hs_code: '6104',
      country_code: 'UAE',
      measure_type: 'Technical Barriers to Trade',
      description: 'Conformity assessment requirement for textile products'
    },
    {
      id: 2,
      hs_code: '5701',
      country_code: 'UAE',
      measure_type: 'Technical Barriers to Trade',
      description: 'Fire safety certification for carpets and floor coverings'
    },
    {
      id: 3,
      hs_code: '1904',
      country_code: 'USA',
      measure_type: 'Sanitary and Phytosanitary Measures',
      description: 'Food safety regulations for processed food products'
    }
  ]
};

/**
 * Service for managing data sources used by the Compliance MCP
 */
export class DataSourceService {
  private supabaseClient: SupabaseClient | null = null;

  constructor() {
    // Initialize Supabase client if not in test mode
    if (!isTestMode) {
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Supabase credentials not provided. Some features may not work.');
      return;
    }

    try {
      this.supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      console.log('Supabase client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
    }
  }

  /**
   * Get a database client for direct database operations
   */
  public getDbClient() {
    return this.supabaseClient;
  }
  
  /**
   * Get export requirements for a specific country, sector, and subsector
   * Uses both Supabase data and API data as needed
   * @param countryCode ISO country code
   * @param sector Business sector (optional)
   * @param subsector Business subsector (optional)
   * @param hsCode HS code (optional)
   * @returns Array of export requirements
   */
  public async getExportRequirements(
    countryCode: string,
    sector?: string,
    subsector?: string,
    hsCode?: string
  ): Promise<ComplianceRequirement[]> {
    // Create a cache key based on the parameters
    const cacheKey = `export_requirements_${countryCode}_${sector || ''}_${subsector || ''}_${hsCode || ''}`;

    // Check if data is in cache
    const cachedData = cacheService.get<ComplianceRequirement[]>(cacheKey);
    if (cachedData) {
      console.log(`Retrieved export requirements from cache for key: ${cacheKey}`);
      return cachedData;
    }

    console.log(`Fetching export requirements for ${countryCode}, sector: ${sector}, subsector: ${subsector}, hsCode: ${hsCode}`);

    // In test mode, use mock data
    if (isTestMode) {
      let filteredData = mockData.export_requirements.filter(req => req.country_code === countryCode);

      if (sector) {
        filteredData = filteredData.filter(req => req.sector === sector);
      }

      if (subsector) {
        filteredData = filteredData.filter(req => req.subsector === subsector);
      }

      if (hsCode) {
        filteredData = filteredData.filter(req => req.hs_code === hsCode || 
          (req.hs_code && req.hs_code.startsWith(hsCode.slice(0, 4))));
      }

      // Cache the result and return with explicit type casting
      const typedResult = filteredData as unknown as ComplianceRequirement[];
      cacheService.set(cacheKey, typedResult, 3600); // Cache for 1 hour
      return typedResult;
    }

    // Use Supabase client
    if (!this.supabaseClient) {
      throw new Error('Database client not initialized');
    }

    let query = this.supabaseClient
      .from('export_requirements')
      .select('*')
      .eq('country_code', countryCode);

    if (sector) {
      query = query.eq('sector', sector);
    }

    if (subsector) {
      query = query.eq('subsector', subsector);
    }

    if (hsCode) {
      // Handle HS code matching (exact or prefix)
      query = query.or(`hs_code.eq.${hsCode},hs_code.like.${hsCode.slice(0, 4)}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Cache the result
    cacheService.set(cacheKey, data || [], 3600); // Cache for 1 hour
    return data || [];
  }
  
  /**
   * Get regulatory authority information for a country and sector
   * @param countryCode ISO country code
   * @param sector Business sector
   * @returns Regulatory source information
   */
  public async getRegulatoryAuthorities(
    countryCode: string,
    sector?: string
  ): Promise<RegulatorySource[]> {
    // Create a cache key based on the parameters
    const cacheKey = `regulatory_authorities_${countryCode}_${sector || ''}`;

    // Check if data is in cache
    const cachedData = cacheService.get<RegulatorySource[]>(cacheKey);
    if (cachedData) {
      console.log(`Retrieved regulatory authorities from cache for key: ${cacheKey}`);
      return cachedData;
    }

    console.log(`Fetching regulatory authorities for ${countryCode}, sector: ${sector}`);

    // In test mode, use mock data
    if (isTestMode) {
      let filteredData = mockData.regulatory_sources.filter(source => {
        let match = source.country_code === countryCode;
        if (match && sector) match = match && source.sector === sector;
        return match;
      });
      
      // Cache the result
      cacheService.set(cacheKey, filteredData, 3600); // Cache for 1 hour
      return filteredData;
    }

    // Use Supabase client
    if (!this.supabaseClient) {
      throw new Error('Database client not initialized');
    }

    let query = this.supabaseClient
      .from('regulatory_sources')
      .select('*')
      .eq('country_code', countryCode);

    if (sector) {
      query = query.eq('sector', sector);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Cache the result
    cacheService.set(cacheKey, data || [], 3600); // Cache for 1 hour
    return data || [];
  }
  
  /**
   * Get non-tariff measures from WITS for a specific product
   * @param hsCode HS code (6 digits)
   * @param importerCountry Importer country code
   * @returns Array of non-tariff measures
   */
  public async getNonTariffMeasures(hsCode: string, importerCountry: string) {
    // Create a cache key based on the parameters
    const cacheKey = `non_tariff_measures_${hsCode}_${importerCountry}`;

    // Check if data is in cache
    const cachedData = cacheService.get<any[]>(cacheKey);
    if (cachedData) {
      console.log(`Retrieved non-tariff measures from cache for key: ${cacheKey}`);
      return cachedData;
    }

    console.log(`Fetching non-tariff measures for HS code: ${hsCode}, country: ${importerCountry}`);

    // In test mode, use mock data
    if (isTestMode) {
      // Filter by country and HS code (exact or prefix)
      const filteredData = mockData.non_tariff_measures.filter(measure => 
        measure.country_code === importerCountry && 
        (measure.hs_code === hsCode || measure.hs_code.startsWith(hsCode.slice(0, 4)))
      );

      // Cache the result
      cacheService.set(cacheKey, filteredData, 3600); // Cache for 1 hour
      return filteredData;
    }

    // Use Supabase client
    if (!this.supabaseClient) {
      throw new Error('Database client not initialized');
    }

    // Handle HS code matching (exact or prefix)
    const { data, error } = await this.supabaseClient
      .from('non_tariff_measures')
      .select('*')
      .eq('country_code', importerCountry)
      .or(`hs_code.eq.${hsCode},hs_code.like.${hsCode.slice(0, 4)}%`);

    if (error) {
      throw error;
    }

    // Cache the result
    cacheService.set(cacheKey, data || [], 3600); // Cache for 1 hour
    return data || [];
  }
  
  /**
   * Check if a regulatory website has been updated since last check
   * @param source Regulatory source to check
   * @returns Boolean indicating if updates were detected
   */
  public async checkRegulatoryUpdates(source: RegulatorySource): Promise<boolean> {
    try {
      // Get current website content
      const content = await this.scrapeRegulatoryWebsite(source.official_website);
      
      if (!content) return false;
      
      // In a real implementation, we would:
      // 1. Get the previously stored content hash from the database
      // 2. Compare the new content hash with the stored one
      // 3. If different, update the database and return true
      
      // For this example, we'll just return a predefined value
      return source.has_updates || false;
    } catch (error) {
      console.error('Error checking for regulatory updates:', error);
      return false;
    }
  }

  /**
   * Scrape regulatory information from a regulatory website
   * @param url URL of the regulatory website
   * @returns Scraped content or null if failed
   */
  public async scrapeRegulatoryWebsite(url?: string): Promise<string | null> {
    if (!url) return null;
    
    // In a real implementation, this would use a scraping library or API
    // For this mock implementation, just return a success message
    return "Mock website content";
  }

  public mockQuery(table: string, field: string, value: any): { data: any[] | null; error: any } {
    if (!mockData[table as keyof typeof mockData]) {
      return { data: null, error: new Error(`Table ${table} not found in mock data`) };
    }

    const data = mockData[table as keyof typeof mockData].filter((item: any) => item[field] === value);
    return { data, error: null };
  }
}

// Export a singleton instance
export const dataSourceService = new DataSourceService(); 