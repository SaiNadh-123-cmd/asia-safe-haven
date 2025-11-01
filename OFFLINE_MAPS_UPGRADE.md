# Offline Safety Maps - IndexedDB Upgrade ✅

## What Changed

### 1. **Storage Upgrade: localStorage → IndexedDB**

**Before**: localStorage (5MB limit)
**After**: IndexedDB (unlimited storage via `idb-keyval`)

#### Benefits:
- ✅ **No more 5MB storage limit** - Store dozens of maps per device
- ✅ **Better performance** - Async operations don't block UI
- ✅ **More reliable** - Better error handling and quota management
- ✅ **Future-proof** - Can store larger, more detailed maps

### 2. **Proper Coordinate Parsing**

Fixed coordinate handling to ensure Leaflet renders markers correctly:

```typescript
// ❌ WRONG (GeoJSON format - lon, lat)
L.marker([feature.geometry.coordinates[0], feature.geometry.coordinates[1]])

// ✅ CORRECT (Leaflet format - lat, lon)
L.marker([feature.lat, feature.lon])
```

**Key Fixes:**
- Parse string coordinates to numbers: `parseFloat(lat)`
- Validate coordinate ranges: `-90 ≤ lat ≤ 90`, `-180 ≤ lon ≤ 180`
- Always use `[latitude, longitude]` order for Leaflet
- Log warnings for invalid coordinates

### 3. **Enhanced SafetyMapViewer Component**

Created a comprehensive viewer with:
- ✅ Coordinate validation before rendering
- ✅ Proper error handling for malformed data
- ✅ Beautiful custom markers (user location, shelters, routes)
- ✅ Interactive popups with shelter details
- ✅ "No data found" fallback message
- ✅ Map legend and statistics
- ✅ Responsive design

---

## Updated Files

### Core Services
- `src/lib/indexedDB.ts` - New IndexedDB wrapper using `idb-keyval`
- `src/services/safetyMapService.ts` - Updated to use IndexedDB instead of localStorage

### Components
- `src/components/SafetyMapViewer.tsx` - NEW standalone map viewer
- `src/components/MapPreviewModal.tsx` - Existing modal (unchanged)
- `src/components/SafetyMapDownloader.tsx` - Updated to use async IndexedDB
- `src/pages/SafetyMaps.tsx` - Updated to use async IndexedDB

---

## How It Works

### 1. Download Flow
```
User selects location + disaster type
    ↓
Fetch data from Overpass API (25km radius)
    ↓
Convert to SafetyMapData format
    ↓
Store in IndexedDB with key: map_[location]_[disasterType]
    ↓
Show preview with SafetyMapViewer
```

### 2. Coordinate Parsing
```typescript
// SafetyMapViewer validates and converts coordinates:
const lat = typeof bunker.lat === 'string' ? parseFloat(bunker.lat) : bunker.lat;
const lon = typeof bunker.lon === 'string' ? parseFloat(bunker.lon) : bunker.lon;

// Validate ranges
if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
  L.marker([lat, lon]).addTo(map); // Leaflet format: [lat, lon]
}
```

### 3. Storage Structure

**IndexedDB Key Format**: `map_[location]_[disasterType]`
- Example: `map_Mumbai_flood`

**StoredMapData Interface**:
```typescript
{
  location: string;           // "Mumbai"
  disasterType: string;       // "flood"
  coordinates: { lat, lon };  // Center point
  features: SafetyFeature[];  // Combined bunkers + routes
  metadata: {
    downloadedAt: string;     // ISO timestamp
    size: number;             // Bytes
    radius: number;           // km
  }
}
```

---

## Testing Checklist

### ✅ Download Maps
1. Navigate to Safety Maps page
2. Click "Download New Map"
3. Search for a city (e.g., "Mumbai")
4. Select disaster type (flood/earthquake/cyclone)
5. Click "Download" → Should show progress bar
6. **Expected**: Success toast + map preview modal

### ✅ View Maps
1. After download, map card should appear in grid
2. Click "View" button
3. **Expected**: Interactive Leaflet map with:
   - Red pin at center (your location)
   - Green pins for shelters (🛡️)
   - Blue pins for evacuation routes (→)
   - Clickable popups with details

### ✅ Delete Maps
1. Click trash icon on any map card
2. **Expected**: Map removed from grid + success toast

### ✅ Offline Access
1. Download a map
2. Open browser DevTools → Application → Storage → IndexedDB
3. Verify map is stored in `keyval-store`
4. Disconnect internet
5. Refresh page
6. **Expected**: Map still loads from IndexedDB

### ✅ Empty Map Handling
1. Download map for remote location (e.g., "Leh, Ladakh")
2. If no shelters found, **Expected**:
   - Warning toast: "No data found"
   - Map shows only user location pin
   - Yellow alert: "No official shelters found. Stay indoors..."

---

## Coordinate Format Reference

### GeoJSON (from APIs)
```json
{
  "geometry": {
    "coordinates": [lon, lat]  // Longitude FIRST
  }
}
```

### Leaflet (for rendering)
```typescript
L.marker([lat, lon])  // Latitude FIRST
```

### Our Format (internal storage)
```typescript
{
  lat: 19.0760,  // Latitude
  lon: 72.8777   // Longitude
}
```

**Rule**: Always store as `{ lat, lon }` and render as `[lat, lon]` for Leaflet.

---

## Known Limitations

### 1. **Overpass API Data Quality**
- Not all areas have mapped shelters in OpenStreetMap
- Rural areas may have sparse data
- Some shelters may lack detailed tags

**Fallback**: If no data found, we add a default marker at user's location.

### 2. **Coordinate Precision**
- Overpass returns coordinates to ~7 decimal places
- We store full precision (no rounding in maps)
- Weather API uses rounded coordinates for privacy

### 3. **Map Size**
- 25km radius typically = 2-4MB per map
- IndexedDB can handle 100+ maps easily
- Browser quota is per-origin (~50MB minimum, often more)

---

## Debugging

### Console Logs to Check

**Download Process**:
```
Nominatim: Found 5 results for "Mumbai"
Fetching flood safety data for (19.0760, 72.8777) within 25km...
Overpass: Found 12 bunkers and 8 routes
Storing map "Mumbai": 3.42 KB
✓ Map stored successfully in IndexedDB: Mumbai (flood)
```

**Map Rendering**:
```
Initializing map at [19.0760, 72.8777]
Map rendered: 12 shelters, 8 routes
```

**Invalid Coordinates** (warnings are normal for bad OSM data):
```
Invalid bunker coordinates: { id: "node-12345", lat: NaN, lon: 72.8777 }
```

### DevTools Inspection

**IndexedDB**:
1. Open DevTools → Application tab
2. IndexedDB → keyval-store → keyval
3. Click on keys like `map_mumbai_flood`
4. Verify `features` array has lat/lon values

**Network**:
1. Network tab → Filter: `overpass-api.de`
2. Check response payload for `elements` array
3. Verify elements have `lat`, `lon` or `center.lat`, `center.lon`

---

## Migration from Old localStorage

If users have old maps in localStorage:

```typescript
// Manual migration script (run in console)
const oldKeys = Object.keys(localStorage).filter(k => k.startsWith('safetyMap_'));
console.log(`Found ${oldKeys.length} old maps in localStorage`);

for (const key of oldKeys) {
  const data = JSON.parse(localStorage.getItem(key));
  // Convert to new format and store in IndexedDB
  await storeMapOffline(data);
  localStorage.removeItem(key);
  console.log(`Migrated: ${key}`);
}
```

---

## Future Enhancements

### Planned Features
- [ ] GPS navigation to nearest shelter
- [ ] Offline map updates (check for newer data)
- [ ] Community reporting (user-submitted shelters)
- [ ] Polyline routes (instead of just markers)
- [ ] 3D terrain view for flood risk
- [ ] Integration with government disaster APIs (NDMA)

### API Integration Candidates
- **Bhuvan (ISRO)**: Official India hazard layers
- **NDMA OGD**: District-level shelter data
- **Google Maps Directions**: Offline route calculation
- **Mapbox**: Better basemap tiles

---

## Support

### Common Issues

**Q: Maps not loading after download?**
- Check browser console for errors
- Verify IndexedDB is enabled (not blocked by privacy settings)
- Try deleting and re-downloading the map

**Q: No shelters found for my city?**
- OpenStreetMap may not have data for your area
- Contribute to OSM: https://www.openstreetmap.org/
- Use the default marker as a reference point

**Q: Map shows wrong location?**
- Verify coordinates in DevTools → IndexedDB
- Check if Nominatim returned correct city
- Try searching with state name (e.g., "Pune, Maharashtra")

**Q: Storage quota exceeded?**
- Delete old maps from the safety maps page
- Check browser settings → Site Storage

### Report Issues
- GitHub: [DisasterAlert Issues](https://github.com/your-repo/issues)
- Email: support@disasteralert.app

---

## Credits

- **OpenStreetMap**: Map data (ODbL license)
- **Leaflet.js**: Interactive maps (BSD license)
- **idb-keyval**: IndexedDB wrapper (Apache 2.0)
- **Overpass API**: OSM query service

---

**Last Updated**: 2025-11-01
**Version**: 2.0.0 (IndexedDB upgrade)
