/**
 * IndexedDB wrapper using idb-keyval for offline map storage
 * Provides unlimited storage (vs localStorage's 5MB limit)
 */
import { get, set, del, keys } from 'idb-keyval';

export interface StoredMapData {
  location: string;
  disasterType: string;
  coordinates: { lat: number; lon: number };
  features: any[];
  metadata: {
    downloadedAt: string;
    size: number;
    radius: number;
  };
}

/**
 * Store safety map in IndexedDB
 */
export async function storeMapInDB(
  location: string,
  disasterType: string,
  mapData: StoredMapData
): Promise<void> {
  const key = `map_${location}_${disasterType}`.replace(/\s+/g, '_').toLowerCase();
  
  try {
    await set(key, mapData);
    console.log(`✓ Map stored in IndexedDB: ${key} (${(JSON.stringify(mapData).length / 1024).toFixed(2)}KB)`);
    
    // Update map list
    const mapList = await getMapsList();
    if (!mapList.includes(key)) {
      mapList.push(key);
      await set('safetyMaps_list', mapList);
    }
  } catch (error) {
    console.error('Failed to store map in IndexedDB:', error);
    throw new Error('Failed to save map for offline use');
  }
}

/**
 * Retrieve safety map from IndexedDB
 */
export async function getMapFromDB(
  location: string,
  disasterType: string
): Promise<StoredMapData | null> {
  const key = `map_${location}_${disasterType}`.replace(/\s+/g, '_').toLowerCase();
  
  try {
    const data = await get<StoredMapData>(key);
    return data || null;
  } catch (error) {
    console.error('Failed to retrieve map from IndexedDB:', error);
    return null;
  }
}

/**
 * Delete safety map from IndexedDB
 */
export async function deleteMapFromDB(
  location: string,
  disasterType: string
): Promise<void> {
  const key = `map_${location}_${disasterType}`.replace(/\s+/g, '_').toLowerCase();
  
  try {
    await del(key);
    
    // Update map list
    const mapList = await getMapsList();
    const updatedList = mapList.filter(k => k !== key);
    await set('safetyMaps_list', updatedList);
    
    console.log(`✓ Map deleted from IndexedDB: ${key}`);
  } catch (error) {
    console.error('Failed to delete map from IndexedDB:', error);
    throw error;
  }
}

/**
 * Get list of all stored map keys
 */
export async function getMapsList(): Promise<string[]> {
  try {
    const list = await get<string[]>('safetyMaps_list');
    return list || [];
  } catch {
    return [];
  }
}

/**
 * Get all stored maps with metadata
 */
export async function getAllMapsFromDB(): Promise<StoredMapData[]> {
  const mapKeys = await getMapsList();
  const maps: StoredMapData[] = [];
  
  for (const key of mapKeys) {
    try {
      const mapData = await get<StoredMapData>(key);
      if (mapData) {
        maps.push(mapData);
      }
    } catch (error) {
      console.error(`Failed to parse map ${key}:`, error);
    }
  }
  
  return maps;
}

/**
 * Check available storage space (estimate)
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  }
  return { usage: 0, quota: 0 };
}
