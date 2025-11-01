import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SafetyMapDownloader } from '@/components/SafetyMapDownloader';
import { MapPreviewModal } from '@/components/MapPreviewModal';
import { getAllStoredMaps, deleteStoredMap } from '@/services/safetyMapService';
import { Shield, Download, Trash2, MapPin, ArrowLeft, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const disasterEmojis: Record<string, string> = {
  flood: '🌊',
  earthquake: '🏚️',
  cyclone: '🌀'
};

export default function SafetyMaps() {
  const [storedMaps, setStoredMaps] = useState<any[]>([]);
  const [showDownloader, setShowDownloader] = useState(false);
  const [previewMap, setPreviewMap] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadStoredMaps();
  }, []);

  const loadStoredMaps = async () => {
    const maps = await getAllStoredMaps();
    setStoredMaps(maps);
  };

  const handleDeleteMap = async (location: string, disasterType: string) => {
    try {
      await deleteStoredMap(location, disasterType);
      await loadStoredMaps();
      toast.success('Safety map deleted');
    } catch (error) {
      toast.error('Failed to delete map');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Safety Maps
              </h1>
              <p className="text-muted-foreground mt-2">
                Download and manage offline safety maps for disaster preparedness
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setShowDownloader(!showDownloader)}
              className="hidden md:flex"
            >
              <Download className="h-5 w-5 mr-2" />
              Download New Map
            </Button>
          </div>
        </div>

        {/* Mobile Download Button */}
        <Button
          size="lg"
          onClick={() => setShowDownloader(!showDownloader)}
          className="w-full md:hidden mb-6"
        >
          <Download className="h-5 w-5 mr-2" />
          Download New Map
        </Button>

        {/* Downloader Section */}
        {showDownloader && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <SafetyMapDownloader />
          </motion.div>
        )}

        {/* Stored Maps Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Your Downloaded Maps ({storedMaps.length})
          </h2>

          {storedMaps.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Safety Maps Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Download your first safety map to access disaster shelters and evacuation routes offline
                </p>
                <Button onClick={() => setShowDownloader(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Your First Map
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {storedMaps.map((map, index) => {
                const sizeInMB = (map.metadata.size / (1024 * 1024)).toFixed(2);
                return (
                  <motion.div
                    key={`${map.location}-${map.disaster_type}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">
                              {disasterEmojis[map.disaster_type] || '🗺️'}
                            </span>
                            <div>
                              <CardTitle className="text-lg">{map.location}</CardTitle>
                              <CardDescription className="capitalize">
                                {map.disaster_type} Safety
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-green-500/10 rounded p-2 text-center">
                            <p className="font-bold">{map.bunkers.length}</p>
                            <p className="text-xs text-muted-foreground">Shelters</p>
                          </div>
                          <div className="bg-blue-500/10 rounded p-2 text-center">
                            <p className="font-bold">{map.routes.length}</p>
                            <p className="text-xs text-muted-foreground">Routes</p>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Radius:</span>
                            <Badge variant="secondary">{map.metadata.radius}km</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Size:</span>
                            <span>{sizeInMB}MB</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Downloaded:</span>
                            <span>{new Date(map.metadata.downloadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setPreviewMap(map)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteMap(map.location, map.disaster_type)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Section */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              About Safety Maps
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Maps include verified disaster shelters and evacuation routes</li>
              <li>• All data is stored locally for offline access during emergencies</li>
              <li>• Maps cover a 50km radius around your selected location</li>
              <li>• Tap on any shelter or route marker to see detailed information</li>
              <li>• Update maps regularly to ensure you have the latest safety information</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      {previewMap && (
        <MapPreviewModal
          isOpen={!!previewMap}
          onClose={() => setPreviewMap(null)}
          mapData={previewMap}
        />
      )}
    </div>
  );
}
