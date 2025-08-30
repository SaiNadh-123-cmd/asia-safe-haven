import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SafetyStatus } from "./SafetyStatus";
import { WeatherStats } from "./WeatherStats";
import { AlertCard } from "./AlertCard";
import { DisasterGrid } from "./DisasterGrid";
import { PrecautionsModal } from "./PrecautionsModal";
import { StoriesModal } from "./StoriesModal";
import { DisasterDetailsModal } from "./DisasterDetailsModal";
import { DisasterType } from "./DisasterIcon";
import { enhancedWeatherService, WeatherData, DisasterAlert, LocationData } from "@/services/enhancedWeatherService";
import { aiService } from "@/services/aiService";
import { 
  MapPin, 
  RefreshCw, 
  Settings, 
  Bell,
  Wifi,
  WifiOff,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface DashboardProps {
  userLocation: LocationData;
  onLocationChange: () => void;
}

export const Dashboard = ({ userLocation, onLocationChange }: DashboardProps) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Modal states
  const [precautionsModal, setPrecautionsModal] = useState({ 
    isOpen: false, 
    disaster: 'flood' as DisasterType, 
    location: userLocation.city,
    active: true
  });
  const [storiesModal, setStoriesModal] = useState({ 
    isOpen: false, 
    disaster: 'flood' as DisasterType, 
    location: userLocation.city 
  });
  const [detailsModal, setDetailsModal] = useState({ 
    isOpen: false, 
    disaster: 'flood' as DisasterType 
  });


  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch data
  const fetchData = async () => {
    if (!isOnline) {
      toast.error("No internet connection. Using cached data.");
      return;
    }

    setIsLoading(true);
    try {
      const [weather, disasters] = await Promise.all([
        enhancedWeatherService.getCurrentWeather(userLocation),
        enhancedWeatherService.getDisasterAlerts(userLocation)
      ]);
      
      setWeatherData(weather);
      setAlerts(disasters);
      setLastUpdated(new Date());
      
      // Show notifications for high-severity alerts
      disasters.forEach(alert => {
        if (alert.severity === 'high') {
          toast.error(`${alert.type.toUpperCase()} ALERT: ${alert.description}`, {
            duration: 10000,
          });
        } else if (alert.severity === 'medium') {
          toast.warning(`${alert.type} warning in ${alert.location}`, {
            duration: 5000,
          });
        }
      });
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to fetch latest data");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    fetchData();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userLocation, isOnline]);

  const handleViewPrecautions = (disaster?: DisasterType) => {
    const disasterType = disaster || (weatherData?.safetyLevel === 'danger' ? 'flood' : 'flood');
    const isActive = Boolean(disaster && alerts.some(alert => alert.type === disaster));
    setPrecautionsModal({
      isOpen: true,
      disaster: disasterType,
      location: userLocation.city,
      active: isActive
    });
  };

  const handleViewStories = (disaster?: DisasterType) => {
    const disasterType = disaster || (weatherData?.safetyLevel === 'danger' ? 'flood' : 'flood');
    setStoriesModal({
      isOpen: true,
      disaster: disasterType,
      location: userLocation.city
    });
  };

  const handleDisasterSelect = (disaster: DisasterType) => {
    setDetailsModal({
      isOpen: true,
      disaster
    });
  };

  const handleAlertDetails = (alert: DisasterAlert) => {
    setDetailsModal({
      isOpen: true,
      disaster: alert.type as DisasterType
    });
  };

  const handleAlertPrecautions = (alert: DisasterAlert) => {
    setPrecautionsModal({
      isOpen: true,
      disaster: alert.type as DisasterType,
      location: alert.location,
      active: true // This is always for an active disaster
    });
  };

  if (!weatherData && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <h2 className="text-xl font-semibold">Loading DisasterAlert</h2>
            <p className="text-muted-foreground">Fetching safety information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-hero flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">DisasterAlert</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {userLocation.city}, {userLocation.state || userLocation.country}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onLocationChange}
                    className="h-auto p-0 text-xs underline"
                  >
                    Change
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-safe" />
                ) : (
                  <WifiOff className="h-3 w-3 text-danger" />
                )}
                <span className={isOnline ? 'text-safe' : 'text-danger'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={fetchData}
                disabled={isLoading || !isOnline}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Weather Stats */}
        {weatherData && (
          <WeatherStats weatherData={weatherData} />
        )}

        {/* Safety Status */}
        {weatherData && (
          <SafetyStatus
            weatherData={weatherData}
            onViewPrecautions={() => handleViewPrecautions()}
            onViewStories={() => handleViewStories()}
          />
        )}

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-danger" />
                Active Alerts
                <Badge variant="destructive" className="ml-2">
                  {alerts.length}
                </Badge>
              </h2>
              <div className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
            
            <div className="grid gap-4">
              {alerts.map((alert, index) => (
                <AlertCard
                  key={index}
                  alert={alert}
                  onViewDetails={() => handleAlertDetails(alert)}
                  onGetPrecautions={() => handleAlertPrecautions(alert)}
                />
              ))}
            </div>
          </div>
        )}

        {alerts.length === 0 && weatherData?.safetyLevel === 'safe' && (
          <Card className="bg-gradient-safe/10 border-safe/20">
            <CardContent className="flex items-center gap-3 p-6">
              <div className="h-12 w-12 rounded-full bg-safe/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-safe" />
              </div>
              <div>
                <h3 className="font-semibold text-safe">All Clear</h3>
                <p className="text-sm text-muted-foreground">
                  No active disaster alerts for {userLocation.city}. Stay prepared!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Disaster Education Grid */}
        <DisasterGrid onDisasterSelect={handleDisasterSelect} />

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-xs text-muted-foreground">Monitoring</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">AI</div>
                <div className="text-xs text-muted-foreground">Powered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">Real-time</div>
                <div className="text-xs text-muted-foreground">Updates</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">Multi-lingual</div>
                <div className="text-xs text-muted-foreground">Support</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <PrecautionsModal
        isOpen={precautionsModal.isOpen}
        onClose={() => setPrecautionsModal(prev => ({ ...prev, isOpen: false }))}
        disaster={precautionsModal.disaster}
        location={precautionsModal.location}
        active={precautionsModal.active}
      />

      <StoriesModal
        isOpen={storiesModal.isOpen}
        onClose={() => setStoriesModal(prev => ({ ...prev, isOpen: false }))}
        disaster={storiesModal.disaster}
        location={storiesModal.location}
      />

      <DisasterDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal(prev => ({ ...prev, isOpen: false }))}
        disaster={detailsModal.disaster}
        onViewPrecautions={() => {
          setDetailsModal(prev => ({ ...prev, isOpen: false }));
          handleViewPrecautions(detailsModal.disaster);
        }}
        onViewStories={() => {
          setDetailsModal(prev => ({ ...prev, isOpen: false }));
          handleViewStories(detailsModal.disaster);
        }}
      />
    </div>
  );
};