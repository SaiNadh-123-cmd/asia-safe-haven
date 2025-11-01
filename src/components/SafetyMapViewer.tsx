import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Navigation, MapPin, AlertCircle } from 'lucide-react';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface SafetyMapViewerProps {
  mapData: {
    location: string;
    coordinates: { lat: number; lon: number };
    disaster_type: string;
    bunkers: Array<{
      id: string;
      type: string;
      name: string;
      lat: number;
      lon: number;
      tags: Record<string, string>;
    }>;
    routes: Array<{
      id: string;
      type: string;
      name: string;
      lat: number;
      lon: number;
      tags: Record<string, string>;
    }>;
    metadata: {
      downloadedAt: string;
      size: number;
      radius: number;
    };
  };
  className?: string;
}

export const SafetyMapViewer = ({ mapData, className = '' }: SafetyMapViewerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Validate coordinates (Leaflet format: [latitude, longitude])
    const centerLat = mapData.coordinates.lat;
    const centerLon = mapData.coordinates.lon;

    // Ensure coordinates are valid numbers
    if (
      typeof centerLat !== 'number' || 
      typeof centerLon !== 'number' ||
      centerLat < -90 || centerLat > 90 ||
      centerLon < -180 || centerLon > 180
    ) {
      console.error('Invalid coordinates:', { lat: centerLat, lon: centerLon });
      return;
    }

    console.log(`Initializing map at [${centerLat}, ${centerLon}]`);

    // Initialize map with validated coordinates
    const map = L.map(mapContainerRef.current).setView([centerLat, centerLon], 12);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Add center marker (user location)
    const centerIcon = L.divIcon({
      className: 'custom-center-icon',
      html: `
        <div style="
          background: hsl(var(--primary));
          border: 3px solid white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        ">
          <span style="color: white; font-size: 16px;">📍</span>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    L.marker([centerLat, centerLon], { icon: centerIcon })
      .addTo(map)
      .bindPopup(`<strong>${mapData.location}</strong><br/>Your location`)
      .openPopup();

    // Custom icon for bunkers/shelters
    const bunkerIcon = L.divIcon({
      className: 'custom-bunker-icon',
      html: `
        <div style="
          background: #10b981;
          border: 2px solid white;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          <span style="color: white; font-size: 16px;">🛡️</span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    // Add bunker/shelter markers with proper coordinate parsing
    let validBunkers = 0;
    mapData.bunkers.forEach((bunker) => {
      // Parse coordinates - handle both number and string types
      const lat = typeof bunker.lat === 'string' ? parseFloat(bunker.lat) : bunker.lat;
      const lon = typeof bunker.lon === 'string' ? parseFloat(bunker.lon) : bunker.lon;

      // Validate coordinates
      if (
        !isNaN(lat) && !isNaN(lon) &&
        lat >= -90 && lat <= 90 &&
        lon >= -180 && lon <= 180
      ) {
        // Leaflet uses [lat, lon] format (NOT [lon, lat])
        L.marker([lat, lon], { icon: bunkerIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 150px;">
              <strong>🛡️ ${bunker.name}</strong><br/>
              <span style="color: #666; font-size: 12px;">Safety Shelter</span><br/>
              <span style="color: #999; font-size: 11px;">Type: ${bunker.tags.emergency || bunker.tags.building || 'Shelter'}</span>
              ${bunker.tags.capacity ? `<br/><span style="color: #999; font-size: 11px;">Capacity: ${bunker.tags.capacity}</span>` : ''}
            </div>
          `);
        validBunkers++;
      } else {
        console.warn('Invalid bunker coordinates:', { id: bunker.id, lat, lon });
      }
    });

    // Custom icon for evacuation routes
    const routeIcon = L.divIcon({
      className: 'custom-route-icon',
      html: `
        <div style="
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          <span style="color: white; font-size: 12px;">→</span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // Add route markers with proper coordinate parsing
    let validRoutes = 0;
    mapData.routes.forEach((route) => {
      // Parse coordinates
      const lat = typeof route.lat === 'string' ? parseFloat(route.lat) : route.lat;
      const lon = typeof route.lon === 'string' ? parseFloat(route.lon) : route.lon;

      // Validate coordinates
      if (
        !isNaN(lat) && !isNaN(lon) &&
        lat >= -90 && lat <= 90 &&
        lon >= -180 && lon <= 180
      ) {
        // Leaflet uses [lat, lon] format
        L.marker([lat, lon], { icon: routeIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 150px;">
              <strong>→ ${route.name}</strong><br/>
              <span style="color: #666; font-size: 12px;">Evacuation Route</span><br/>
              <span style="color: #999; font-size: 11px;">Type: ${route.tags.highway || 'Path'}</span>
            </div>
          `);
        validRoutes++;
      } else {
        console.warn('Invalid route coordinates:', { id: route.id, lat, lon });
      }
    });

    console.log(`Map rendered: ${validBunkers} shelters, ${validRoutes} routes`);

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapData]);

  const sizeInMB = (mapData.metadata.size / (1024 * 1024)).toFixed(2);
  const hasData = mapData.bunkers.length > 0 || mapData.routes.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {mapData.location} - {mapData.disaster_type.charAt(0).toUpperCase() + mapData.disaster_type.slice(1)} Safety Map
        </CardTitle>
        <CardDescription>
          {hasData ? (
            <>
              {mapData.bunkers.length} shelters and {mapData.routes.length} evacuation routes within {mapData.metadata.radius}km
            </>
          ) : (
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              No official safety data found. Showing your location only.
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Map Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <Shield className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{mapData.bunkers.length}</p>
            <p className="text-xs text-muted-foreground">Shelters</p>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <Navigation className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{mapData.routes.length}</p>
            <p className="text-xs text-muted-foreground">Routes</p>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-3 text-center">
            <MapPin className="h-5 w-5 mx-auto mb-1 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">{mapData.metadata.radius}km</p>
            <p className="text-xs text-muted-foreground">Radius</p>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="rounded-lg overflow-hidden border-2 border-border">
          <div 
            ref={mapContainerRef} 
            style={{ height: '500px', width: '100%' }}
            className="bg-muted"
          />
        </div>

        {/* Map Legend */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm font-medium mb-3">Map Legend:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white border-2 border-white shadow">
                📍
              </div>
              <span>Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow">
                🛡️
              </div>
              <span>Safety Shelters</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow text-xs">
                →
              </div>
              <span>Evacuation Routes</span>
            </div>
          </div>
        </div>

        {/* Map Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Offline Ready</Badge>
            <span>Size: ~{sizeInMB}MB</span>
          </div>
          <span>Downloaded: {new Date(mapData.metadata.downloadedAt).toLocaleDateString()}</span>
        </div>

        {!hasData && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm">
            <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">No Official Shelters Found</p>
            <p className="text-yellow-700 dark:text-yellow-300">
              Stay indoors during alerts, move to higher ground for floods, or seek open areas for earthquakes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
