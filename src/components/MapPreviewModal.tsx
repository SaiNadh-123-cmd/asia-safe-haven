import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Navigation, Shield, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface MapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapData: {
    location: string;
    coordinates: { lat: number; lon: number };
    disaster_type: string;
    bunkers: any[];
    routes: any[];
    metadata: {
      downloadedAt: string;
      size: number;
      radius: number;
    };
  };
}

export const MapPreviewModal = ({ isOpen, onClose, mapData }: MapPreviewModalProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView(
      [mapData.coordinates.lat, mapData.coordinates.lon],
      12
    );

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Add center marker
    L.marker([mapData.coordinates.lat, mapData.coordinates.lon])
      .addTo(map)
      .bindPopup(`<strong>${mapData.location}</strong><br/>Your location`)
      .openPopup();

    // Custom icons for bunkers and routes
    const bunkerIcon = L.divIcon({
      className: 'custom-bunker-icon',
      html: `
        <div style="
          background: #10b981;
          border: 2px solid white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          <span style="color: white; font-size: 14px;">🛡️</span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // Add bunkers
    mapData.bunkers.forEach(bunker => {
      if (bunker.lat && bunker.lon) {
        L.marker([bunker.lat, bunker.lon], { icon: bunkerIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 150px;">
              <strong>🛡️ ${bunker.name}</strong><br/>
              <span style="color: #666; font-size: 12px;">Safety Shelter</span><br/>
              <span style="color: #999; font-size: 11px;">Type: ${bunker.tags.emergency || bunker.tags.building || 'Shelter'}</span>
            </div>
          `);
      }
    });

    // Add routes (simplified as markers for now)
    mapData.routes.forEach(route => {
      if (route.lat && route.lon) {
        const routeIcon = L.divIcon({
          className: 'custom-route-icon',
          html: `
            <div style="
              background: #3b82f6;
              border: 2px solid white;
              border-radius: 50%;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              <span style="color: white; font-size: 10px;">→</span>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        L.marker([route.lat, route.lon], { icon: routeIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 150px;">
              <strong>→ ${route.name}</strong><br/>
              <span style="color: #666; font-size: 12px;">Evacuation Route</span><br/>
              <span style="color: #999; font-size: 11px;">Type: ${route.tags.highway || 'Path'}</span>
            </div>
          `);
      }
    });

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, mapData]);

  const sizeInMB = (mapData.metadata.size / (1024 * 1024)).toFixed(2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Safety Map Preview - {mapData.location}
          </DialogTitle>
          <DialogDescription>
            {mapData.disaster_type.charAt(0).toUpperCase() + mapData.disaster_type.slice(1)}{' '}
            safety map with {mapData.bunkers.length} shelters and {mapData.routes.length}{' '}
            evacuation routes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <Shield className="h-5 w-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{mapData.bunkers.length}</p>
              <p className="text-xs text-muted-foreground">Shelters</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3 text-center">
              <Navigation className="h-5 w-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{mapData.routes.length}</p>
              <p className="text-xs text-muted-foreground">Routes</p>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-3 text-center">
              <MapPin className="h-5 w-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{mapData.metadata.radius}km</p>
              <p className="text-xs text-muted-foreground">Radius</p>
            </div>
          </div>

          {/* Map */}
          <div className="rounded-lg overflow-hidden border-2 border-border">
            <div ref={mapContainerRef} style={{ height: '400px', width: '100%' }} />
          </div>

          {/* Legend */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Map Legend:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white">
                  🛡️
                </div>
                <span>Safety Shelters</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  →
                </div>
                <span>Evacuation Routes</span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              <Badge variant="secondary" className="mr-2">
                Offline Ready
              </Badge>
              <span>Map size: ~{sizeInMB}MB</span>
            </div>
            <span>Downloaded: {new Date(mapData.metadata.downloadedAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
