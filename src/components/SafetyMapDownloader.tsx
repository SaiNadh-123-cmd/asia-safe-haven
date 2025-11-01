import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, MapPin, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { LocationInput } from './LocationInput';
import { MapPreviewModal } from './MapPreviewModal';
import {
  fetchOverpassSafetyData,
  storeMapOffline,
  getRecommendedDisasterTypes
} from '@/services/safetyMapService';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const disasterInfo: Record<string, { icon: string; color: string; description: string }> = {
  flood: {
    icon: '🌊',
    color: 'bg-blue-500',
    description: 'High-ground shelters and safe evacuation routes'
  },
  earthquake: {
    icon: '🏚️',
    color: 'bg-orange-500',
    description: 'Open areas and earthquake-safe buildings'
  },
  cyclone: {
    icon: '🌀',
    color: 'bg-purple-500',
    description: 'Reinforced shelters and storm-safe routes'
  }
};

interface SafetyMapDownloaderProps {
  initialLocation?: {
    name: string;
    lat: number;
    lon: number;
    city: string;
    state: string;
  };
}

export const SafetyMapDownloader = ({ initialLocation }: SafetyMapDownloaderProps) => {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [selectedDisaster, setSelectedDisaster] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [mapData, setMapData] = useState<any>(null);

  const recommendedDisasters = selectedLocation?.state
    ? getRecommendedDisasterTypes(selectedLocation.state)
    : ['flood', 'earthquake', 'cyclone'];

  const handleDownloadMap = async () => {
    if (!selectedLocation || !selectedDisaster) {
      toast.error('Please select a location and disaster type');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      // Fetch safety data with 25km radius (optimized)
      const safetyData = await fetchOverpassSafetyData(
        selectedLocation.lat,
        selectedLocation.lon,
        selectedDisaster,
        25 // 25km radius for better performance
      );

      clearInterval(progressInterval);
      setDownloadProgress(95);

      // Check if we found any data
      if (safetyData.bunkers.length === 0 && safetyData.routes.length === 0) {
        toast.warning(t('safetyMaps.noData'));
      }

      // Store map data
      const mapDataToStore = {
        location: selectedLocation.city,
        coordinates: { lat: selectedLocation.lat, lon: selectedLocation.lon },
        disaster_type: selectedDisaster,
        bunkers: safetyData.bunkers,
        routes: safetyData.routes,
        metadata: {
          downloadedAt: new Date().toISOString(),
          size: JSON.stringify(safetyData).length,
          radius: 25
        }
      };

      await storeMapOffline(mapDataToStore);
      setMapData(mapDataToStore);
      setDownloadProgress(100);

      toast.success(
        t('safetyMaps.downloadSuccess', {
          location: selectedLocation.city,
          disasterType: selectedDisaster
        }) + ` ${safetyData.bunkers.length} ${t('map.shelters').toLowerCase()}, ${safetyData.routes.length} ${t('map.routes').toLowerCase()}.`
      );

      // Show preview
      setTimeout(() => {
        setShowPreview(true);
        setIsDownloading(false);
      }, 500);
    } catch (error: any) {
      console.error('Download error:', error);
      
      // Show specific error messages with retry option
      if (error.message.includes('quota')) {
        toast.error(t('safetyMaps.storageError'), {
          action: {
            label: t('common.retry'),
            onClick: () => handleDownloadMap()
          }
        });
      } else if (error.message.includes('too large')) {
        toast.error(t('safetyMaps.mapTooLarge'));
      } else {
        toast.error(
          t('safetyMaps.downloadError', {
            location: selectedLocation.city,
            disasterType: selectedDisaster
          }),
          {
            action: {
              label: t('common.retry'),
              onClick: () => handleDownloadMap()
            }
          }
        );
      }
      
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {t('safetyMaps.title')}
          </CardTitle>
          <CardDescription>
            {t('safetyMaps.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Location Input */}
          <LocationInput
            onLocationSelect={setSelectedLocation}
            initialValue={selectedLocation?.name}
          />

          {selectedLocation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Selected Location Display */}
              <Card className="bg-accent/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">
                      {selectedLocation.city}, {selectedLocation.state}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Disaster Type Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  {t('safetyMaps.selectDisaster')}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recommendedDisasters.map(disaster => {
                    const info = disasterInfo[disaster];
                    return (
                      <motion.button
                        key={disaster}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedDisaster(disaster)}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          selectedDisaster === disaster
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        >
                        <div className="text-3xl mb-2">{info.icon}</div>
                        <h4 className="font-semibold capitalize mb-1">{t(`disaster.${disaster}`)}</h4>
                        <p className="text-xs text-muted-foreground">{t(`disaster.${disaster}.description`)}</p>
                        {recommendedDisasters.indexOf(disaster) < 2 && (
                          <Badge className="absolute top-2 right-2 text-xs" variant="secondary">
                            Recommended
                          </Badge>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Download Section */}
              {selectedDisaster && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">What's included:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Safety shelters and bunkers within 25km</li>
                            <li>• Evacuation routes and safe zones</li>
                            <li>• Offline access (approx. 2-4MB)</li>
                            <li>• GPS coordinates for navigation</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {isDownloading && (
                    <div className="space-y-2">
                      <Progress value={downloadProgress} className="h-2" />
                      <p className="text-sm text-center text-muted-foreground">
                        {downloadProgress < 90
                          ? 'Fetching safety data...'
                          : 'Storing map offline...'}
                      </p>
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleDownloadMap}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {t('safetyMaps.downloading')}
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5 mr-2" />
                        {t('safetyMaps.download')} {selectedLocation.city}
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Map Preview Modal */}
      {showPreview && mapData && (
        <MapPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          mapData={mapData}
        />
      )}
    </>
  );
};

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
