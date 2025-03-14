/**
 * Standard data structures and enums used throughout the application
 */

export namespace StandardDataStructures {
  export enum FrequencyType {
    ONCE_OFF = "once-off",
    ONGOING = "ongoing",
    PERIODIC = "periodic",
    ANNUAL = "annual",
    BIANNUAL = "biannual",
    QUARTERLY = "quarterly",
    MONTHLY = "monthly"
  }
  
  export enum RequirementType {
    CERTIFICATION = "certification",
    DOCUMENTATION = "documentation",
    TESTING = "testing",
    REGISTRATION = "registration",
    INSPECTION = "inspection",
    PERMIT = "permit",
    LICENSE = "license",
    STANDARD = "standard",
    OTHER = "other"
  }
  
  export enum ValidationStatus {
    VERIFIED = "verified",
    UNVERIFIED = "unverified",
    OUTDATED = "outdated"
  }
  
  export enum TradeFlowType {
    EXPORT = "export",
    IMPORT = "import",
    RE_EXPORT = "re-export",
    RE_IMPORT = "re-import"
  }
  
  export enum MarketType {
    DEVELOPED = "developed",
    EMERGING = "emerging",
    FRONTIER = "frontier"
  }
  
  export enum CompetitivePosition {
    LEADER = "leader",
    CHALLENGER = "challenger",
    FOLLOWER = "follower",
    NICHE = "niche"
  }
  
  export enum ComplianceLevel {
    FULLY_COMPLIANT = "fully-compliant",
    PARTIALLY_COMPLIANT = "partially-compliant",
    NON_COMPLIANT = "non-compliant"
  }
  
  export enum PriorityLevel {
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
  }
  
  export enum IndustryCategory {
    AGRICULTURE = "agriculture",
    MANUFACTURING = "manufacturing",
    MINING = "mining",
    SERVICES = "services",
    TECHNOLOGY = "technology",
    FOOD_BEVERAGE = "food-beverage",
    TEXTILE = "textile",
    ELECTRONICS = "electronics",
    CHEMICALS = "chemicals",
    AUTOMOTIVE = "automotive",
    OTHER = "other"
  }
  
  // Standard country codes (ISO 3166-1 alpha-3)
  export const CountryCodes = {
    SOUTH_AFRICA: "ZAF",
    UNITED_STATES: "USA",
    UNITED_KINGDOM: "GBR",
    UNITED_ARAB_EMIRATES: "ARE",
    CHINA: "CHN",
    INDIA: "IND",
    GERMANY: "DEU",
    FRANCE: "FRA",
    JAPAN: "JPN",
    NIGERIA: "NGA",
    KENYA: "KEN",
    GHANA: "GHA",
    BRAZIL: "BRA",
    AUSTRALIA: "AUS",
    CANADA: "CAN"
  };
  
  // Standard regulatory authorities
  export const RegulatoryAuthorities = {
    SOUTH_AFRICA: {
      NRCS: {
        name: "National Regulator for Compulsory Specifications",
        website: "https://www.nrcs.org.za"
      },
      SABS: {
        name: "South African Bureau of Standards",
        website: "https://www.sabs.co.za"
      },
      DALRRD: {
        name: "Department of Agriculture, Land Reform and Rural Development",
        website: "https://www.dalrrd.gov.za"
      },
      SAHPRA: {
        name: "South African Health Products Regulatory Authority",
        website: "https://www.sahpra.org.za"
      },
      ITAC: {
        name: "International Trade Administration Commission",
        website: "http://www.itac.org.za"
      }
    },
    USA: {
      FDA: {
        name: "Food and Drug Administration",
        website: "https://www.fda.gov"
      },
      USDA: {
        name: "United States Department of Agriculture",
        website: "https://www.usda.gov"
      },
      EPA: {
        name: "Environmental Protection Agency",
        website: "https://www.epa.gov"
      },
      FCC: {
        name: "Federal Communications Commission",
        website: "https://www.fcc.gov"
      }
    },
    UK: {
      FSA: {
        name: "Food Standards Agency",
        website: "https://www.food.gov.uk"
      },
      DEFRA: {
        name: "Department for Environment, Food and Rural Affairs",
        website: "https://www.gov.uk/government/organisations/department-for-environment-food-rural-affairs"
      },
      MHRA: {
        name: "Medicines and Healthcare products Regulatory Agency",
        website: "https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency"
      }
    },
    UAE: {
      ESMA: {
        name: "Emirates Authority for Standardization and Metrology",
        website: "https://www.esma.gov.ae"
      },
      MOIAT: {
        name: "Ministry of Industry and Advanced Technology",
        website: "https://www.moiat.gov.ae"
      },
      DM: {
        name: "Dubai Municipality",
        website: "https://www.dm.gov.ae"
      }
    }
  };
} 