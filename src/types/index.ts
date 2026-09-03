export type Severity = 'none' | 'low' | 'moderate' | 'high' | 'severe';

export interface DiseaseResult {
  diseaseName: string;
  confidence: number;
  severity: Severity;
  cropType: string;
  description?: string;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
}

export interface CropRecommendation {
  name: string;
  expectedYield: string;
  growthDuration: string;
  waterRequirement: string;
  reason: string;
  profitability: 'high' | 'medium' | 'low';
}

export interface PriceDataPoint {
  date: string;
  price: number;
}

export interface CropPrice {
  crop: string;
  unit: string;
  currentPrice: number;
  previousPrice: number;
  predictedPrice: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  history: PriceDataPoint[];
}

export interface MarketplaceListing {
  id: string;
  userId: string;
  cropName: string;
  quantity: string;
  pricePerUnit: string;
  location: string;
  farmerName: string;
  description: string;
  datePosted: string;
  listingOrigin?: 'farmer' | 'demo';
  isPersistent?: boolean;
  expiresAt?: string | null;
  imageUrl?: string;
  imageAttribution?: string;
  sourceType?: string;
  sourceUrl?: string;
  contactPhone?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  imageUrl?: string;
  feature?: 'general' | 'disease' | 'crop' | 'marketplace';
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

export * from './farm';
export * from './decision';
export * from './market';
export * from './economicImpact';
export * from './farmActionPlanner';
export * from './dealIntelligence';
