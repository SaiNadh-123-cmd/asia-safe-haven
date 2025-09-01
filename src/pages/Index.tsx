import { useState, useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";
import { LocationSelector } from "@/components/LocationSelector";
import { NotificationSetup } from "@/components/NotificationSetup";
import { LocationData } from "@/services/enhancedWeatherService";

const Index = () => {
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showNotificationSetup, setShowNotificationSetup] = useState(false);

  // Check for saved location on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem("disasterAlert_location");
    const notificationsSetup = localStorage.getItem("disasterAlert_notifications_setup");
    
    if (savedLocation) {
      try {
        const locationData = JSON.parse(savedLocation);
        setUserLocation(locationData);
        
        // Show notification setup if not already done
        if (!notificationsSetup) {
          setShowNotificationSetup(true);
        }
      } catch {
        // If parsing fails, show location selector
        setShowLocationSelector(true);
      }
    } else {
      setShowLocationSelector(true);
    }
  }, []);

  const handleLocationSelect = (location: LocationData) => {
    setUserLocation(location);
    localStorage.setItem("disasterAlert_location", JSON.stringify(location));
    setShowLocationSelector(false);
    
    // Show notification setup after location is selected
    const notificationsSetup = localStorage.getItem("disasterAlert_notifications_setup");
    if (!notificationsSetup) {
      setShowNotificationSetup(true);
    }
  };

  const handleLocationChange = () => {
    setShowLocationSelector(true);
  };

  const handleNotificationSetupComplete = () => {
    setShowNotificationSetup(false);
    localStorage.setItem("disasterAlert_notifications_setup", "true");
  };

  // Show location selector first if no location
  if (showLocationSelector || !userLocation) {
    return <LocationSelector onLocationSelect={handleLocationSelect} />;
  }

  // Show notification setup after location is set
  if (showNotificationSetup) {
    return <NotificationSetup onComplete={handleNotificationSetupComplete} />;
  }

  return (
    <Dashboard 
      userLocation={userLocation} 
      onLocationChange={handleLocationChange}
    />
  );
};

export default Index;
