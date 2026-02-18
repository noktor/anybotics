export interface Site {
  siteId: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, string>;
}

export interface Asset {
  assetId: string;
  siteId: string;
  parentAssetId?: string;
  name: string;
  assetType: AssetType;
  description?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, string>;
}

export enum AssetType {
  AREA = 'area',
  EQUIPMENT = 'equipment',
  INSPECTION_POINT = 'inspection_point',
}
