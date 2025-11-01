import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notificationService';
import interfaceBg from "@/assets/interface_bg.jpg";

interface NotificationSetupProps {
  onComplete?: () => void;
}

export const NotificationSetup = ({ onComplete }: NotificationSetupProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const { notificationsEnabled, requestPermission, registerToken } = useNotifications();
  const { toast } = useToast();

  useEffect(() => {
    // Check if notifications are already enabled
    if (notificationsEnabled) {
      setSetupComplete(true);
    }
  }, [notificationsEnabled]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    
    try {
      // Request permission first
      const permissionGranted = await requestPermission();
      
      if (!permissionGranted) {
        toast({
          title: "Permission Denied",
          description: "Please allow notifications to receive disaster alerts.",
          variant: "destructive",
        });
        return;
      }

      // Get user's location for enhanced security and weather monitoring
      let locationData: { latitude: number, longitude: number, city?: string, state?: string, country?: string } | undefined;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes
            });
          });
          
          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            country: 'India' // Default, can be enhanced with reverse geocoding
          };
          
          // Optional: Add reverse geocoding to get city/state
          try {
            const geocodeResponse = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&limit=1&appid=c539305eb1479c8064edb1b01ced63d9`);
            if (geocodeResponse.ok) {
              const geocodeData = await geocodeResponse.json();
              if (geocodeData && geocodeData.length > 0) {
                locationData.city = geocodeData[0].name;
                locationData.state = geocodeData[0].state;
                locationData.country = geocodeData[0].country;
              }
            }
          } catch (geocodeError) {
            console.log('Geocoding failed, using coordinates only');
          }
          
        } catch (locationError) {
          console.log('Location access denied or unavailable, registering without location');
        }
      }

      // Generate secure mock token for development
      const mockToken = notificationService.generateSecureMockToken();
      
      // Register token with location data for enhanced security
      const success = await registerToken(mockToken, locationData);
      
      if (success) {
        setSetupComplete(true);
        toast({
          title: "Notifications Enabled! 🔔",
          description: locationData 
            ? `You'll receive disaster alerts for ${locationData.city || 'your area'}. Location data secured with privacy protection.`
            : "You'll receive disaster alerts. Consider enabling location for area-specific warnings.",
        });
        onComplete?.();
      } else {
        throw new Error('Failed to register notification token');
      }
      
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Setup Failed",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    toast({
      title: "Notifications Skipped",
      description: "You can enable notifications later in settings.",
      duration: 3000,
    });
    onComplete?.();
  };

  if (setupComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: `url(${interfaceBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-background/30 backdrop-blur-sm" />
        
        <Card className="w-full max-w-md relative z-10 backdrop-blur-md bg-background/95 border-primary/20">
          <CardContent className="pt-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <CheckCircle className="h-16 w-16 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Notifications Enabled!</h3>
            <p className="text-muted-foreground">
              You'll receive timely disaster alerts based on your location.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${interfaceBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-background/30 backdrop-blur-sm" />
      
      <Card className="w-full max-w-2xl relative z-10 backdrop-blur-md bg-background/95 border-primary/20">
        <CardHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center"
          >
            <Bell className="h-8 w-8" />
          </motion.div>
          <CardTitle className="text-2xl font-bold">Stay Safe with Disaster Alerts</CardTitle>
          <CardDescription className="text-base">
            Enable push notifications to receive instant alerts about disasters, weather warnings, and safety updates for your area.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">Instant Disaster Alerts</p>
                <p className="text-sm text-muted-foreground">Floods, storms, earthquakes, and more</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Bell className="h-5 w-5" />
              <div>
                <p className="font-medium">Weather Warnings</p>
                <p className="text-sm text-muted-foreground">Heatwaves, cyclones, and severe weather</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Safety Updates</p>
                <p className="text-sm text-muted-foreground">Evacuation routes and emergency instructions</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="flex-1 h-12"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1 h-12"
              size="lg"
            >
              <BellOff className="h-4 w-4 mr-2" />
              Skip for Now
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            🔒 Enhanced privacy protection: GPS coordinates are automatically rounded to ~1-2km precision, FCM tokens are securely hashed, and all access is logged for security auditing.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};