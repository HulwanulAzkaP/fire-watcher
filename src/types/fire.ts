export type RiskLevel = 'Kritis' | 'Waspada' | 'Siaga' | 'Aman';

export type SatelliteSource = 'VIIRS-NOAA20' | 'VIIRS-NPP' | 'MODIS-Aqua' | 'MODIS-Terra';

export type LandCoverType =
  | 'Lahan Gambut'
  | 'Hutan Lindung'
  | 'Perkebunan'
  | 'Semak Belukar'
  | 'Pemukiman'
  | 'Pertanian';

export interface Hotspot {
  id: string;
  latitude: number;
  longitude: number;
  brightnessKelvin: number;
  brightnessCelsius: number;
  frp: number; // Fire Radiative Power (MW)
  confidence: number; // 0 - 100%
  confidenceLevel: 'Tinggi' | 'Sedang' | 'Rendah';
  satellite: SatelliteSource;
  acqDateTime: string; // ISO string
  province: string;
  regency: string;
  landCover: LandCoverType;
  windDirection?: string;
  windSpeedKmH?: number;
}

export type ISPUCategory =
  | 'Baik'
  | 'Sedang'
  | 'Tidak Sehat'
  | 'Sangat Tidak Sehat'
  | 'Berbahaya';

export interface AirQualityStation {
  id: string;
  cityName: string;
  province: string;
  latitude: number;
  longitude: number;
  ispu: number;
  pm25: number; // µg/m³
  category: ISPUCategory;
  categoryColor: string;
  healthAdvice: string;
  updatedAt: string;
}

export interface ProvinceSummary {
  id: string;
  name: string;
  code: string;
  island: 'Sumatra' | 'Kalimantan' | 'Jawa' | 'Sulawesi' | 'Nusa Tenggara' | 'Maluku' | 'Papua';
  riskLevel: RiskLevel;
  activeHotspots: number;
  burntAreaHa: number;
  damkarUnits: number;
  relawanCount: number;
  center: [number, number]; // [lng, lat]
}

export interface FieldReport {
  id: string;
  reporterName: string;
  organization?: string;
  phone?: string;
  category: 'Karhutla' | 'Lahan Gambut' | 'Pemukiman' | 'Hutan Gunung' | 'Industri';
  locationName: string;
  province: string;
  regency: string;
  latitude: number;
  longitude: number;
  fireStatus: 'Api Membesar' | 'Asap Pekat' | 'Terkendali' | 'Padam';
  waterAccess: boolean;
  roadAccess: boolean;
  urgentNeeds: string[];
  notes: string;
  createdAt: string;
  verified: boolean;
  upvotes: number;
}

export interface PoskoUnit {
  id: string;
  name: string;
  type: 'Manggala Agni' | 'BPBD & Damkar' | 'Relawan MPA' | 'Posko Kesehatan & Masker';
  locationName: string;
  province: string;
  regency: string;
  latitude: number;
  longitude: number;
  personnelCount: number;
  waterTankerCount: number;
  floatingPumpCount: number;
  n95MaskStock: number;
  contactPerson: string;
  contactPhone: string;
  status: 'Operasi Pemadaman' | 'Siaga Patroli' | 'Distribusi Bantuan';
}

export type MapLayerStyle = 'dark' | 'satellite' | 'topo' | 'outdoor';

export interface ActiveFilters {
  confidenceMin: number;
  selectedProvince: string; // '__all__' or province name
  showHotspots: boolean;
  showFieldReports: boolean;
  showPosko: boolean;
  showISPU: boolean;
  showRiskPolygons: boolean;
  showClusterCount: boolean;
  fireStatusFilter: string; // '__all__' or status
}
