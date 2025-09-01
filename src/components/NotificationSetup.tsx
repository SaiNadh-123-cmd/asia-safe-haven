import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';

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
      const granted = await requestPermission();
      
      if (granted) {
        // In a real app, you would get the FCM token from Firebase SDK
        // For now, we'll generate a mock token
        const mockToken = `fcm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const registered = await registerToken(mockToken);
        
        if (registered) {
          setSetupComplete(true);
          toast({
            title: "Notifications Enabled",
            description: "You'll receive disaster alerts based on your location.",
            duration: 3000,
          });
          onComplete?.();
        } else {
          throw new Error('Failed to register for notifications');
        }
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings to receive disaster alerts.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Notification setup error:', error);
      toast({
        title: "Setup Failed",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
        duration: 5000,
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
        className="flex items-center justify-center p-4"
      >
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
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
      className="flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center"
          >
            <Bell className="h-8 w-8 text-white" />
          </motion.div>
          <CardTitle className="text-2xl font-bold">Stay Safe with Disaster Alerts</CardTitle>
          <CardDescription className="text-base">
            Enable push notifications to receive instant alerts about disasters, weather warnings, and safety updates for your area.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Instant Disaster Alerts</p>
                <p className="text-sm text-muted-foreground">Floods, storms, earthquakes, and more</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Weather Warnings</p>
                <p className="text-sm text-muted-foreground">Heatwaves, cyclones, and severe weather</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
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
            🔒 We respect your privacy. Notifications are sent only for your selected location and you can disable them anytime in settings.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};