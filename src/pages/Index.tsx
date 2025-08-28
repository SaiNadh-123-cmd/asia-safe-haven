import { useState, useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";
import { LocationSelector } from "@/components/LocationSelector";
import { LocationData } from "@/services/enhancedWeatherService";

const Index = () => {
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  // Check for saved location on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem("disasterAlert_location");
    if (savedLocation) {
      try {
        const locationData = JSON.parse(savedLocation);
        setUserLocation(locationData);
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
  };

  const handleLocationChange = () => {
    setShowLocationSelector(true);
  };

  if (showLocationSelector || !userLocation) {
    return <LocationSelector onLocationSelect={handleLocationSelect} />;
  }

  return (
    <Dashboard 
      userLocation={userLocation} 
      onLocationChange={handleLocationChange}
    />
  );
};

export default Index;
