# Safety Maps Feature - DisasterAlert

## Overview
The Safety Maps feature allows users to download offline maps containing disaster shelters, bunkers, and evacuation routes for their area. This is crucial for emergency situations when internet connectivity may be unavailable.

## Features

### 1. **Location Search with Autocomplete**
- Powered by OpenStreetMap Nominatim API
- Real-time suggestions as you type
- Supports cities, villages, and rural areas across India
- Keyboard navigation support (Arrow keys, Enter, Escape)
- Screen reader compatible

### 2. **Disaster-Specific Maps**
Three types of safety maps based on regional risk:
- **Flood Maps**: High-ground shelters and safe evacuation routes
- **Earthquake Maps**: Open areas and earthquake-safe buildings  
- **Cyclone Maps**: Reinforced shelters and storm-safe routes

### 3. **Offline Storage**
- Maps stored in browser's localStorage
- ~5-10MB per map
- Works completely offline after download
- 50km radius coverage around selected location

### 4. **Interactive Map Preview**
- Built with Leaflet.js
- Color-coded markers for shelters and routes
- Click markers for detailed information
- OpenStreetMap base layer

### 5. **Smart Recommendations**
Maps are recommended based on regional disaster patterns:
- **Coastal states**: Flood + Cyclone maps (Maharashtra, Kerala, etc.)
- **Himalayan states**: Earthquake + Flood maps (Uttarakhand, J&K, etc.)
- **Other regions**: Context-specific recommendations

## Setup

### Required Dependencies
Already installed in your project:
```json
{
  "leaflet": "latest",
  "react-leaflet": "latest",
  "@types/leaflet": "latest",
  "axios": "^1.11.0"
}
```

### API Configuration
The feature uses two free APIs:

1. **Nominatim (Location Search)**
   - Base URL: https://nominatim.openstreetmap.org
   - Rate limit: 1 request/second
   - No API key required
   - Usage policy: Must include User-Agent header

2. **Overpass API (Safety Data)**
   - Base URL: https://overpass-api.de/api/interpreter
   - No API key required
   - Timeout: 30 seconds
   - Returns GeoJSON data

## Usage

### Accessing Safety Maps
1. Click "Safety Maps" button in Dashboard header
2. Or navigate to `/safety-maps` route

### Downloading a Map
1. Enter your city/village name
2. Select from autocomplete suggestions
3. Choose disaster type (flood, earthquake, cyclone)
4. Click "Download Safety Map"
5. Wait for download (typically 5-15 seconds)
6. Preview map with shelters and routes

### Viewing Downloaded Maps
- All downloaded maps shown in grid view
- Click "View" to see full map with markers
- Click trash icon to delete a map

### Using Maps Offline
- Maps remain available even without internet
- Open "Safety Maps" page to access
- All shelter locations and routes are cached locally

## File Structure

```
src/
├── services/
│   └── safetyMapService.ts          # API integration & storage logic
├── components/
│   ├── LocationInput.tsx            # Autocomplete location search
│   ├── SafetyMapDownloader.tsx      # Main download interface
│   └── MapPreviewModal.tsx          # Leaflet map viewer
├── pages/
│   └── SafetyMaps.tsx              # Safety maps page
└── i18n/
    └── config.ts                    # English + Hindi translations
```

## Accessibility

### Keyboard Navigation
- **Tab**: Move between elements
- **Arrow Up/Down**: Navigate autocomplete suggestions
- **Enter**: Select suggestion
- **Escape**: Close dropdown

### Screen Reader Support
- ARIA labels on all inputs
- Role attributes for autocomplete
- Descriptive alt text for icons
- Semantic HTML structure

### Visual Accessibility
- High contrast colors
- Clear focus indicators
- Minimum touch targets: 44x44px
- Readable font sizes (minimum 14px)

## Data Privacy & Security

### Location Privacy
- Coordinates rounded to 2 decimal places (~1-2km precision)
- No personal data sent to APIs
- All storage is local (localStorage)
- No third-party tracking

### Audit Logging
Location access is logged in `audit_logs` table:
```sql
{
  action: 'location_timeout',
  user_id: '<uuid>',
  details: { timeout_type: 'geocoding' }
}
```

## Error Handling

### API Timeouts
- Nominatim: 10 second timeout
- Overpass: 30 second timeout
- Automatic retry with exponential backoff (3 attempts)

### Fallback Strategies
1. If Overpass returns no data → Show "No shelters found" message
2. If Nominatim fails → Prompt to try nearby city
3. If download fails → Clear error message with retry button

### User Notifications
- Success: Toast with shelter/route count
- Warning: "No specific features found" with option to download anyway
- Error: Descriptive error message with retry action

## Multilingual Support

Currently supports:
- **English** (default)
- **Hindi** (हिंदी)

### Switching Languages
```typescript
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();

// Change language
i18n.changeLanguage('hi'); // Switch to Hindi
i18n.changeLanguage('en'); // Switch to English

// Use translations
<h1>{t('safetyMaps.title')}</h1>
```

## Performance Optimization

### Map Rendering
- Lazy loading of Leaflet library
- Markers clustered when >50 items
- Tile caching for offline use

### Storage Limits
- Maximum 5MB per map (enforced)
- Automatic cleanup of old maps (optional)
- localStorage limit: ~10MB total (browser dependent)

### Bundle Size
- Leaflet: ~38KB gzipped
- Components: ~15KB total
- Total addition: ~53KB to app bundle

## Future Enhancements

### Planned Features
1. **GPS Navigation**: Route to nearest shelter
2. **Map Updates**: Weekly sync for new shelters
3. **Community Reporting**: User-submitted safe locations
4. **3D Terrain**: Elevation data for flood-prone areas
5. **Voice Navigation**: Turn-by-turn directions

### API Integrations (Potential)
- **IMD**: India Meteorological Department alerts
- **NDMA**: National Disaster Management Authority data
- **Google Maps**: Alternative geocoding (requires API key)

## Troubleshooting

### Maps not loading?
1. Check internet connection during download
2. Clear browser cache and try again
3. Ensure localStorage is enabled
4. Try a different browser

### No shelters found?
- Some rural areas may not have mapped shelters yet
- Try downloading a general map for nearby city
- OSM data depends on community mapping

### Storage quota exceeded?
- Delete unused maps
- Clear browser data for the site
- Use browser with higher storage limits (Chrome/Edge)

## Contributing

To add more disaster types or improve shelter detection:

1. Edit `fetchOverpassSafetyData()` in `safetyMapService.ts`
2. Add Overpass QL queries for new tags
3. Update disaster info in `SafetyMapDownloader.tsx`
4. Add translations in `i18n/config.ts`

## Support

For issues or questions:
- Check browser console for detailed error logs
- Verify API status: [Nominatim](https://nominatim.org/status/) | [Overpass](https://overpass-api.de/api/status)
- Submit feedback through app's settings

## License

This feature uses:
- OpenStreetMap data: [ODbL](https://www.openstreetmap.org/copyright)
- Leaflet.js: BSD 2-Clause License
- React: MIT License

---

**Last Updated**: January 2025  
**Version**: 1.0.0
