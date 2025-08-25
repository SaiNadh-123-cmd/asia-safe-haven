import { useState, useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";
import { LocationSelector } from "@/components/LocationSelector";

const Index = () => {
  const [userLocation, setUserLocation] = useState<string>("");
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  // Check for saved location on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem("disasterAlert_location");
    if (savedLocation) {
      setUserLocation(savedLocation);
    } else {
      setShowLocationSelector(true);
    }
  }, []);

  const handleLocationSelect = (location: string) => {
    setUserLocation(location);
    localStorage.setItem("disasterAlert_location", location);
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
