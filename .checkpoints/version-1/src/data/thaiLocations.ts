import thaiLocationsData from './thaiLocations.json';

export const THAI_LOCATIONS: Record<string, string[]> = thaiLocationsData;

export const THAI_PROVINCES: string[] = Object.keys(THAI_LOCATIONS);

export function getDistrictsByProvince(province: string): string[] {
  if (!province) return [];
  return THAI_LOCATIONS[province] || [];
}
