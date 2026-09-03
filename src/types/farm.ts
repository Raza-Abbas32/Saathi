/**
 * Farm Context Types
 *
 * Defines the schema for local farm memory, soil characteristics,
 * water access, current crop state, and field location.
 *
 * NOTE: Farm Context data is currently stored 100% locally on the user's
 * device. It is not transmitted to external AI or backend databases.
 */

export type SoilType = 'Sandy' | 'Loamy' | 'Clay' | 'Silt' | 'Unknown';

export type WaterSource = 'Canal' | 'Tube well' | 'Rainfed' | 'Mixed' | 'Other';

export type CropStage =
  | 'Land preparation'
  | 'Sowing'
  | 'Germination'
  | 'Vegetative growth'
  | 'Flowering'
  | 'Fruiting / grain filling'
  | 'Maturity'
  | 'Harvest';

export interface FarmContext {
  /** Optional custom identifier or name for the farm */
  farmName?: string;
  /** Total cultivated size in acres */
  farmSizeAcres?: number;
  /** Pakistani province (e.g., Punjab, Sindh, KPK, Balochistan) */
  province?: string;
  /** Administrative district (e.g., Faisalabad, Multan, Sukkur) */
  district?: string;
  /** Optional sub-district / tehsil */
  tehsil?: string;
  /** Latitude coordinate (reuses weather coordinate by default) */
  latitude?: number;
  /** Longitude coordinate (reuses weather coordinate by default) */
  longitude?: number;
  /** Dominant soil texture */
  soilType?: SoilType;
  /** Primary source of irrigation water */
  waterSource?: WaterSource;
  /** Currently planted or planned crop name */
  currentCrop?: string;
  /** Seed or crop variety (e.g., Dilkash-20, Akbar-19, Basmati-515) */
  cropVariety?: string;
  /** Approximate date of sowing (YYYY-MM-DD) */
  sowingDate?: string;
  /** Explicitly selected growth stage */
  cropStage?: CropStage;
  /** Irrigation delivery technique (e.g., Flood, Furrow, Drip, Sprinkler) */
  irrigationMethod?: string;
  /** Unix timestamp of last update */
  updatedAt?: number;
}
