# Safety Maps Debugging Guide

## Quick Debug Checklist

### 1. **Check Browser Console Logs**
The Safety Maps feature includes extensive console logging for debugging:

```javascript
// Look for these log messages:
✓ "Nominatim: Found X results for 'query'"
✓ "Overpass: Found X bunkers and X routes"
✓ "Storing map 'key': XX.XX KB"
✓ "localStorage quota: ~XX.XX KB used"
```

**Common Console Errors:**
- `"Nominatim API error:"` - Network issue or rate limit (1 req/sec)
- `"Overpass API error:"` - Timeout or invalid query
- `"Failed to store map:"` - localStorage quota exceeded
- `"Retry attempt remaining: X"` - API retry in progress

### 2. **Inspect localStorage**

Open DevTools → Application → Local Storage:

```javascript
// Check stored maps:
localStorage.getItem('safetyMaps_list') // List of all map keys

// View specific map:
localStorage.getItem('safetymap_mumbai_flood') // Map data as JSON

// Check total storage used:
let totalKB = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    totalKB += (localStorage[key].length + key.length) / 1024;
  }
}
console.log(`Total localStorage: ${totalKB.toFixed(2)} KB`);
```

**Expected Map Keys:**
- Format: `safetymap_[city]_[disaster_type]`
- Example: `safetymap_pune_flood`, `safetymap_delhi_earthquake`

### 3. **Test API Calls Manually**

#### Nominatim API (Location Search)
```bash
# Test location search
curl "https://nominatim.openstreetmap.org/search?format=json&q=Mumbai&countrycodes=in&limit=5&addressdetails=1" \
  -H "User-Agent: DisasterAlertApp/1.0"

# Expected response: Array of locations with lat/lon
```

#### Overpass API (Safety Data)
```bash
# Test flood shelters query (Mumbai example)
curl -X POST "https://overpass-api.de/api/interpreter" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "User-Agent: DisasterAlertApp/1.0" \
  --data '[out:json][timeout:25];(node["emergency"="shelter"](around:25000,19.0760,72.8777););out body;>;out skel qt;'

# Expected response: GeoJSON with shelter nodes
```

### 4. **Common Issues & Solutions**

#### Issue: "Unable to find location"
**Cause:** Nominatim returned no results
**Solution:** 
- Try a nearby city instead of rural village
- Check spelling
- Use state name (e.g., "Pune, Maharashtra")

**Debug:**
```javascript
// Check what was searched
console.log("Query sent:", yourQuery);

// Broader search with limit=10
// API will automatically retry with limit=10 if no results
```

#### Issue: "Request timed out"
**Cause:** Overpass API timeout (30s limit) or network issue
**Solution:**
- Retry (automatic after 2s delay, max 3 attempts)
- Check internet connection
- Reduce search radius (already optimized to 25km)

**Debug:**
```javascript
// Check retry logs
// Look for: "Retry attempt remaining: X. Waiting 2000ms..."
```

#### Issue: "Storage quota exceeded"
**Cause:** localStorage limit reached (~10MB total)
**Solution:**
- Delete old maps from Safety Maps page
- Clear browser data for this site
- Use Chrome/Edge (higher storage limits)

**Debug:**
```javascript
// Check storage usage
console.log(getLocalStorageQuota()); // Logs total KB used

// List all stored maps
JSON.parse(localStorage.getItem('safetyMaps_list'));

// Delete specific map
localStorage.removeItem('safetymap_mumbai_flood');
```

#### Issue: "Map data too large (>4MB)"
**Cause:** Too many shelters/routes in area
**Solution:**
- Radius already optimized to 25km
- Try a less densely populated area
- OSM data varies by region

**Debug:**
```javascript
// Check map size before storage
const mapData = { /* ... */ };
const sizeKB = new Blob([JSON.stringify(mapData)]).size / 1024;
console.log(`Map size: ${sizeKB.toFixed(2)} KB`);
```

#### Issue: "No specific safety features found"
**Cause:** OSM has no mapped shelters/bunkers in area
**Solution:**
- A default marker is automatically added at user location
- Try nearby city with better OSM coverage
- Contribute to OpenStreetMap to improve data

**Debug:**
```javascript
// Check Overpass response
// Look for: "No safety features found, adding default marker"
```

### 5. **Retry Logic Testing**

The feature includes automatic retry (3 attempts, 2s delay):

```javascript
// Retry configuration (in safetyMapService.ts)
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Exponential backoff: 2s → 3s → 4.5s
```

**To test retries:**
1. Disable internet temporarily
2. Try downloading a map
3. Re-enable internet
4. Watch console logs for retry messages

### 6. **Error Toast Messages**

All errors show user-friendly toasts with i18next translations:

| Error | Toast Key | Retry Button? |
|-------|-----------|---------------|
| Location fetch failed | `location.fetchError` | No |
| Download failed | `safetyMaps.downloadError` | Yes ✓ |
| Storage quota exceeded | `safetyMaps.storageError` | Yes ✓ |
| Map too large | `safetyMaps.mapTooLarge` | No |

**Test toasts:**
```javascript
// Check translations loaded
import i18n from '@/i18n/config';
console.log(i18n.t('safetyMaps.downloadError', { location: 'Mumbai', disasterType: 'flood' }));
```

### 7. **Network Request Monitoring**

Open DevTools → Network tab:

**Expected Requests:**
1. **Nominatim** (every location search):
   - URL: `https://nominatim.openstreetmap.org/search?...`
   - Status: 200 OK
   - Response time: ~500-2000ms
   - Rate limit: 1 req/sec (automatic throttling)

2. **Overpass** (map download):
   - URL: `https://overpass-api.de/api/interpreter`
   - Status: 200 OK
   - Response time: ~3-15s (varies by area)
   - Timeout: 30s

**Check for:**
- 429 (Rate limit) → Retry logic triggered
- 504 (Timeout) → Retry logic triggered
- CORS errors → API configuration issue (should not happen)

### 8. **Performance Optimization**

**Current Optimizations:**
- Radius reduced from 50km → 25km (60% faster)
- JSON minified (no whitespace) → ~20% smaller
- Retry with exponential backoff → Better API resilience
- localStorage quota check → Prevent storage errors

**Monitor performance:**
```javascript
// Measure download time
console.time('map_download');
await handleDownloadMap();
console.timeEnd('map_download'); // Expected: 3-10 seconds
```

## Sample Debug Session

```javascript
// 1. User enters "Kalyan, Maharashtra"
// Console: "Nominatim: Found 3 results for 'Kalyan'"

// 2. User selects flood disaster
// Console: "Fetching flood safety data for (19.2403, 73.1305) within 25km..."

// 3. API fetches data
// Console: "Retry attempt remaining: 2. Waiting 2000ms..." (if first attempt fails)
// Console: "Overpass: Found 12 bunkers and 5 routes"

// 4. Data stored
// Console: "Storing map 'safetymap_kalyan_flood': 3.45 KB"
// Console: "localStorage quota: ~15.67 KB used"
// Console: "✓ Map stored successfully: safetymap_kalyan_flood"

// 5. Success toast
// Toast: "Safety map for Kalyan (flood) downloaded! 12 shelters, 5 routes."
```

## Troubleshooting Checklist

- [ ] Check browser console for error logs
- [ ] Verify internet connection
- [ ] Check localStorage quota (DevTools → Application)
- [ ] Test Nominatim API manually (curl)
- [ ] Test Overpass API manually (curl)
- [ ] Clear localStorage and retry
- [ ] Try different location (better OSM coverage)
- [ ] Check i18next translations loaded
- [ ] Verify User-Agent header sent (DisasterAlertApp)
- [ ] Monitor Network tab for API responses

## Need More Help?

1. **Check API Status:**
   - Nominatim: https://nominatim.org/status/
   - Overpass: https://overpass-api.de/api/status

2. **Browser Compatibility:**
   - Chrome/Edge: ✓ Recommended (best localStorage support)
   - Firefox: ✓ Supported
   - Safari: ⚠️ Limited localStorage (5MB)

3. **Report Logs:**
   Share console logs with support team, including:
   - Nominatim query and response
   - Overpass query and response
   - localStorage quota
   - Error messages

---

**Last Updated:** January 2025  
**Version:** 2.0.0 (with retry logic & compression)
