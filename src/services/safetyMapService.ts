import axios from 'axios';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'DisasterAlertApp/1.0';

// Rate limiting for Nominatim (1 req/sec)
let lastNominatimCall = 0;
const NOMINATIM_DELAY = 1000;

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface SafetyFeature {
  id: string;
  type: 'bunker' | 'route';
  name: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  disaster_types: string[];
}

interface SafetyMapData {
  location: string;
  coordinates: { lat: number; lon: number };
  disaster_type: string;
  bunkers: SafetyFeature[];
  routes: SafetyFeature[];
  metadata: {
    downloadedAt: string;
    size: number;
    radius: number;
  };
}

// Haversine distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fetch location suggestions from Nominatim
export async function fetchNominatimSuggestions(query: string): Promise<NominatimResult[]> {
  if (!query || query.length < 2) return [];

  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastNominatimCall;
  if (timeSinceLastCall < NOMINATIM_DELAY) {
    await new Promise(resolve => setTimeout(resolve, NOMINATIM_DELAY - timeSinceLastCall));
  }
  lastNominatimCall = Date.now();

  try {
    const response = await axios.get(`${NOMINATIM_BASE}/search`, {
      params: {
        format: 'json',
        q: query,
        countrycodes: 'in',
        limit: 5,
        addressdetails: 1
      },
      headers: {
        'User-Agent': USER_AGENT
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.error('Nominatim API error:', error);
    throw new Error('Failed to fetch location suggestions. Please try again.');
  }
}

// Fetch safety data from Overpass API
export async function fetchOverpassSafetyData(
  lat: number,
  lon: number,
  disasterType: string,
  radiusKm: number = 50
): Promise<{ bunkers: SafetyFeature[]; routes: SafetyFeature[] }> {
  const radiusMeters = radiusKm * 1000;
  
  // Build Overpass query based on disaster type
  let query = `[out:json][timeout:25];(`;
  
  if (disasterType === 'flood') {
    // Flood shelters on high ground
    query += `
      node["emergency"="assembly_point"](around:${radiusMeters},${lat},${lon});
      node["emergency"="shelter"](around:${radiusMeters},${lat},${lon});
      node["building"="public"]["access"="evacuation"](around:${radiusMeters},${lat},${lon});
      way["highway"="path"]["access"="evacuation"](around:${radiusMeters},${lat},${lon});
      way["highway"="service"]["destination"="safe_zone"](around:${radiusMeters},${lat},${lon});
    `;
  } else if (disasterType === 'earthquake') {
    // Open areas and safe buildings
    query += `
      node["emergency"="assembly_point"](around:${radiusMeters},${lat},${lon});
      node["landuse"="open_space"](around:${radiusMeters},${lat},${lon});
      node["leisure"="park"](around:${radiusMeters},${lat},${lon});
      way["landuse"="open_space"](around:${radiusMeters},${lat},${lon});
      way["leisure"="park"](around:${radiusMeters},${lat},${lon});
    `;
  } else if (disasterType === 'cyclone') {
    // Reinforced shelters
    query += `
      node["emergency"="shelter"]["shelter_type"="cyclone"](around:${radiusMeters},${lat},${lon});
      node["building"="reinforced"](around:${radiusMeters},${lat},${lon});
      node["emergency"="assembly_point"](around:${radiusMeters},${lat},${lon});
      way["emergency"="evacuation_route"](around:${radiusMeters},${lat},${lon});
    `;
  } else {
    // General disaster shelters
    query += `
      node["emergency"="shelter"](around:${radiusMeters},${lat},${lon});
      node["emergency"="assembly_point"](around:${radiusMeters},${lat},${lon});
      way["emergency"="evacuation_route"](around:${radiusMeters},${lat},${lon});
    `;
  }
  
  query += `);out body;>;out skel qt;`;

  try {
    const response = await axios.post(
      OVERPASS_BASE,
      query,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT
        },
        timeout: 30000
      }
    );

    const elements = response.data.elements || [];
    const bunkers: SafetyFeature[] = [];
    const routes: SafetyFeature[] = [];

    elements.forEach((element: any) => {
      if (!element.tags) return;

      const feature: SafetyFeature = {
        id: `${element.type}-${element.id}`,
        type: element.tags.highway ? 'route' : 'bunker',
        name: element.tags.name || element.tags.emergency || element.tags.landuse || 'Unnamed',
        lat: element.lat || (element.center?.lat),
        lon: element.lon || (element.center?.lon),
        tags: element.tags,
        disaster_types: [disasterType]
      };

      // Filter by distance
      if (feature.lat && feature.lon) {
        const distance = calculateDistance(lat, lon, feature.lat, feature.lon);
        if (distance <= radiusKm) {
          if (feature.type === 'route') {
            routes.push(feature);
          } else {
            bunkers.push(feature);
          }
        }
      }
    });

    return { bunkers, routes };
  } catch (error: any) {
    console.error('Overpass API error:', error);
    
    // Retry logic
    if (error.code === 'ECONNABORTED' || error.response?.status === 429) {
      throw new Error('Request timed out. Please try again.');
    }
    
    throw new Error('Failed to fetch safety data. Please try again.');
  }
}

// Store map offline in localStorage
export function storeMapOffline(mapData: SafetyMapData): void {
  const key = `safetyMap_${mapData.location}_${mapData.disaster_type}`.replace(/\s+/g, '_').toLowerCase();
  
  try {
    const serialized = JSON.stringify(mapData);
    const sizeKB = new Blob([serialized]).size / 1024;
    
    if (sizeKB > 5000) { // 5MB limit for localStorage
      throw new Error('Map data too large to store offline');
    }
    
    localStorage.setItem(key, serialized);
    
    // Update map list
    const mapList = getStoredMapsList();
    if (!mapList.includes(key)) {
      mapList.push(key);
      localStorage.setItem('safetyMaps_list', JSON.stringify(mapList));
    }
  } catch (error) {
    console.error('Failed to store map:', error);
    throw new Error('Failed to save map for offline use');
  }
}

// Get stored map from localStorage
export function getStoredMap(location: string, disasterType: string): SafetyMapData | null {
  const key = `safetyMap_${location}_${disasterType}`.replace(/\s+/g, '_').toLowerCase();
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to retrieve map:', error);
    return null;
  }
}

// Get list of all stored maps
export function getStoredMapsList(): string[] {
  try {
    const list = localStorage.getItem('safetyMaps_list');
    return list ? JSON.parse(list) : [];
  } catch {
    return [];
  }
}

// Get all stored maps with metadata
export function getAllStoredMaps(): SafetyMapData[] {
  const mapKeys = getStoredMapsList();
  const maps: SafetyMapData[] = [];
  
  mapKeys.forEach(key => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        maps.push(JSON.parse(stored));
      }
    } catch (error) {
      console.error(`Failed to parse map ${key}:`, error);
    }
  });
  
  return maps;
}

// Delete stored map
export function deleteStoredMap(location: string, disasterType: string): void {
  const key = `safetyMap_${location}_${disasterType}`.replace(/\s+/g, '_').toLowerCase();
  
  localStorage.removeItem(key);
  
  // Update map list
  const mapList = getStoredMapsList().filter(k => k !== key);
  localStorage.setItem('safetyMaps_list', JSON.stringify(mapList));
}

// Get recommended disaster types based on location
export function getRecommendedDisasterTypes(state: string): string[] {
  const stateDisasters: Record<string, string[]> = {
    // Coastal states - floods and cyclones
    'maharashtra': ['flood', 'cyclone'],
    'gujarat': ['flood', 'cyclone', 'earthquake'],
    'west bengal': ['flood', 'cyclone'],
    'odisha': ['flood', 'cyclone'],
    'andhra pradesh': ['flood', 'cyclone'],
    'tamil nadu': ['flood', 'cyclone'],
    'kerala': ['flood'],
    'karnataka': ['flood'],
    'goa': ['flood'],
    
    // Himalayan states - earthquakes and floods
    'uttarakhand': ['earthquake', 'flood'],
    'himachal pradesh': ['earthquake', 'flood'],
    'jammu and kashmir': ['earthquake', 'flood'],
    'sikkim': ['earthquake', 'flood'],
    'assam': ['flood', 'earthquake'],
    
    // Other states
    'bihar': ['flood'],
    'uttar pradesh': ['flood'],
    'rajasthan': ['drought'],
    'punjab': ['flood'],
    'haryana': ['flood'],
  };
  
  const normalizedState = state.toLowerCase();
  return stateDisasters[normalizedState] || ['flood', 'earthquake', 'cyclone'];
}
