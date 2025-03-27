export interface Product {
  id?: string;
  name: string;
  description: string;
  specifications?: string;
  category?: string;
  isSelected?: boolean;
}

export interface BusinessProfile {
  website?: string;
  socials?: string;
}

export interface ProductSelection {
  products: Product[];
}

export interface ProductionVolume {
  volumes: Record<string, {
    current: number;
    unit: string;
  }>;
}

export interface MarketSelection {
  markets: string[];
  priorities: Record<string, number>;
}

export interface MaximumCapacity {
  capacity: Record<string, {
    max: number;
    unit: string;
    timeframe: string;
  }>;
}

export interface Certification {
  name: string;
  status: 'obtained' | 'planned' | 'required';
  obtainedDate?: string;
  plannedDate?: string;
}

export interface CertificationData {
  certifications: Certification[];
}

export interface Budget {
  total: number;
  currency: string;
  breakdown: Record<string, number>;
}

export interface AssessmentData {
  businessProfile: BusinessProfile;
  productSelection: ProductSelection;
  productionVolume: ProductionVolume;
  marketSelection: MarketSelection;
  maxCapacity: MaximumCapacity;
  certifications: CertificationData;
  budget: Budget;
} 