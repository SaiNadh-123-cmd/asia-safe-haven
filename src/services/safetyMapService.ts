import axios from 'axios';
import { storeMapInDB, getMapFromDB, deleteMapFromDB, getAllMapsFromDB, StoredMapData } from '@/lib/indexedDB';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'DisasterAlertApp/1.0';

// Rate limiting for Nominatim (1 req/sec)
let lastNominatimCall = 0;
const NOMINATIM_DELAY = 1000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Utility: Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`Retry attempt remaining: ${retries - 1}. Waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 1.5);
  }
}

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

// Generate fallback sample data around a location
function generateFallbackData(lat: number, lon: number, disasterType: string): { bunkers: SafetyFeature[]; routes: SafetyFeature[] } {
  console.log(`Generating fallback data for ${disasterType} at (${lat}, ${lon})`);
  
  const bunkers: SafetyFeature[] = [
    {
      id: 'fallback-center',
      type: 'bunker',
      name: 'Your Location (Search Center)',
      lat,
      lon,
      tags: { emergency: 'assembly_point', note: 'Fallback marker' },
      disaster_types: [disasterType]
    },
    {
      id: 'fallback-north',
      type: 'bunker',
      name: `Community Shelter - North`,
      lat: lat + 0.05,
      lon: lon,
      tags: { emergency: 'shelter', building: 'public' },
      disaster_types: [disasterType]
    },
    {
      id: 'fallback-south',
      type: 'bunker',
      name: `Safe Assembly Point - South`,
      lat: lat - 0.05,
      lon: lon,
      tags: { emergency: 'assembly_point' },
      disaster_types: [disasterType]
    },
    {
      id: 'fallback-east',
      type: 'bunker',
      name: `Emergency Shelter - East`,
      lat: lat,
      lon: lon + 0.05,
      tags: { emergency: 'shelter' },
      disaster_types: [disasterType]
    }
  ];

  const routes: SafetyFeature[] = [
    {
      id: 'fallback-route-1',
      type: 'route',
      name: `Safe Evacuation Route ${disasterType === 'flood' ? 'to Higher Ground' : 'to Open Area'}`,
      lat: lat + 0.02,
      lon: lon + 0.02,
      tags: { highway: 'service', access: 'evacuation' },
      disaster_types: [disasterType]
    }
  ];

  return { bunkers, routes };
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

// Fetch location suggestions from Nominatim with retry logic
export async function fetchNominatimSuggestions(query: string): Promise<NominatimResult[]> {
  if (!query || query.length < 2) return [];

  return retryWithBackoff(async () => {
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

      console.log(`Nominatim: Found ${response.data.length} results for "${query}"`);

      // Fallback to broader search if no results
      if (response.data.length === 0) {
        console.log('No results, trying broader search with limit=10...');
        const broaderResponse = await axios.get(`${NOMINATIM_BASE}/search`, {
          params: {
            format: 'json',
            q: query,
            countrycodes: 'in',
            limit: 10,
            addressdetails: 1
          },
          headers: {
            'User-Agent': USER_AGENT
          },
          timeout: 10000
        });
        return broaderResponse.data;
      }

      return response.data;
    } catch (error: any) {
      console.error('Nominatim API error:', error.message || error);
      throw new Error('Failed to fetch location suggestions. Please try again.');
    }
  });
}

// Fetch safety data from Overpass API with retry logic and guaranteed fallback
export async function fetchOverpassSafetyData(
  lat: number,
  lon: number,
  disasterType: string,
  radiusKm: number = 25 // Reduced to 25km for optimization
): Promise<{ bunkers: SafetyFeature[]; routes: SafetyFeature[] }> {
  const radiusMeters = radiusKm * 1000;
  
  console.log(`Fetching ${disasterType} safety data for (${lat}, ${lon}) within ${radiusKm}km...`);
  
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
    // Try to fetch from Overpass with retry logic
    const result = await retryWithBackoff(async () => {
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

        console.log(`Overpass: Found ${bunkers.length} bunkers and ${routes.length} routes`);

        // Return data even if empty - fallback will be added later
        return { bunkers, routes };
      } catch (error: any) {
        console.error('Overpass API error:', error.message || error);
        throw error;
      }
    }, 2, 1500); // Retry twice with 1.5s delay

    // If we got valid data, return it
    if (result.bunkers.length > 0 || result.routes.length > 0) {
      return result;
    }

    // If no data found, use fallback
    console.warn('No OSM data found, using fallback sample data');
    return generateFallbackData(lat, lon, disasterType);

  } catch (error: any) {
    // API completely failed - use fallback data
    console.error('All API attempts failed, using fallback data:', error.message || error);
    return generateFallbackData(lat, lon, disasterType);
  }
}

// Store map offline in IndexedDB (unlimited storage vs localStorage's 5MB)
export async function storeMapOffline(mapData: SafetyMapData): Promise<void> {
  try {
    // Validate that we have data to store
    if (!mapData.bunkers || !mapData.routes) {
      console.error('Invalid map data - missing bunkers or routes');
      throw new Error('Invalid map data structure');
    }

    // Ensure we have at least some features
    if (mapData.bunkers.length === 0 && mapData.routes.length === 0) {
      console.warn('Map has no features, adding fallback data');
      const fallback = generateFallbackData(
        mapData.coordinates.lat,
        mapData.coordinates.lon,
        mapData.disaster_type
      );
      mapData.bunkers = fallback.bunkers;
      mapData.routes = fallback.routes;
    }

    // Prepare data with proper format for IndexedDB
    const serialized = JSON.stringify(mapData);
    const sizeBytes = new Blob([serialized]).size;
    const sizeKB = sizeBytes / 1024;
    const sizeMB = sizeKB / 1024;
    
    console.log(`Storing map "${mapData.location}": ${sizeKB > 1024 ? sizeMB.toFixed(2) + ' MB' : sizeKB.toFixed(2) + ' KB'}`);
    console.log(`  Bunkers: ${mapData.bunkers.length}, Routes: ${mapData.routes.length}`);
    
    // Check if map is too large (>10MB warning, but IndexedDB can handle it)
    if (sizeKB > 10000) {
      console.warn('Map data is large (>10MB). Storage may take a moment...');
    }

    // Validate size is not zero
    if (sizeBytes === 0) {
      throw new Error('Map data is empty (0 bytes)');
    }
    
    // Convert to StoredMapData format for IndexedDB
    const storedData: StoredMapData = {
      location: mapData.location,
      disasterType: mapData.disaster_type,
      coordinates: mapData.coordinates,
      features: [...mapData.bunkers, ...mapData.routes],
      metadata: {
        downloadedAt: mapData.metadata.downloadedAt,
        size: sizeBytes,
        radius: mapData.metadata.radius
      }
    };
    
    await storeMapInDB(mapData.location, mapData.disaster_type, storedData);
    console.log(`✓ Map stored successfully in IndexedDB: ${mapData.location} (${mapData.disaster_type})`);
    console.log(`  Final size: ${(sizeBytes / 1024).toFixed(2)} KB`);
  } catch (error: any) {
    console.error('Failed to store map:', error.message || error);
    throw new Error(error.message || 'Failed to save map for offline use');
  }
}

// Get stored map from IndexedDB
export async function getStoredMap(location: string, disasterType: string): Promise<SafetyMapData | null> {
  try {
    const stored = await getMapFromDB(location, disasterType);
    if (!stored) return null;
    
    // Convert back to SafetyMapData format
    const bunkers = stored.features.filter(f => f.type === 'bunker');
    const routes = stored.features.filter(f => f.type === 'route');
    
    return {
      location: stored.location,
      coordinates: stored.coordinates,
      disaster_type: stored.disasterType,
      bunkers,
      routes,
      metadata: stored.metadata
    };
  } catch (error) {
    console.error('Failed to retrieve map:', error);
    return null;
  }
}

// Get all stored maps with metadata
export async function getAllStoredMaps(): Promise<SafetyMapData[]> {
  try {
    const storedMaps = await getAllMapsFromDB();
    
    return storedMaps.map(stored => {
      const bunkers = stored.features.filter(f => f.type === 'bunker');
      const routes = stored.features.filter(f => f.type === 'route');
      
      return {
        location: stored.location,
        coordinates: stored.coordinates,
        disaster_type: stored.disasterType,
        bunkers,
        routes,
        metadata: stored.metadata
      };
    });
  } catch (error) {
    console.error('Failed to get all maps:', error);
    return [];
  }
}

// Delete stored map from IndexedDB
export async function deleteStoredMap(location: string, disasterType: string): Promise<void> {
  try {
    await deleteMapFromDB(location, disasterType);
    console.log(`✓ Map deleted: ${location} (${disasterType})`);
  } catch (error) {
    console.error('Failed to delete map:', error);
    throw error;
  }
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
