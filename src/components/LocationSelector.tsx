import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { LocationData } from "@/services/enhancedWeatherService";
import { supabase } from "@/integrations/supabase/client";

interface LocationSelectorProps {
  onLocationSelect: (location: LocationData) => void;
}

export const LocationSelector = ({ onLocationSelect }: LocationSelectorProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLocationSelect = async (location: LocationData) => {
    setIsLoading(true);
    
    try {
      // Save to Supabase user_profiles if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            latitude: location.latitude,
            longitude: location.longitude,
            city: location.city,
            state: location.state,
            country: location.country
          });
          
        if (error) {
          console.error('Error saving user profile:', error);
        }
      }
      
      // Save to localStorage as fallback
      localStorage.setItem('disasterAlert_location', JSON.stringify(location));
      
      onLocationSelect(location);
    } catch (error) {
      console.error('Error handling location selection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (cityName: string) => {
    // Default coordinates for major cities
    const coordinates: { [key: string]: { lat: number; lon: number; state: string } } = {
      'Delhi': { lat: 28.6139, lon: 77.2090, state: 'Delhi' },
      'Mumbai': { lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
      'Bangalore': { lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
      'Chennai': { lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
      'Kolkata': { lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
      'Hyderabad': { lat: 17.3850, lon: 78.4867, state: 'Telangana' }
    };
    
    const cityData = coordinates[cityName];
    if (cityData) {
      const location: LocationData = {
        city: cityName,
        state: cityData.state,
        country: 'India',
        latitude: cityData.lat,
        longitude: cityData.lon
      };
      handleLocationSelect(location);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-gradient-to-br from-primary/5 to-background flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardHeader className="text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-hero flex items-center justify-center"
            >
              <MapPin className="h-8 w-8 text-white" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Welcome to DisasterAlert
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Choose your location to receive personalized disaster alerts, weather updates, and safety information powered by AI
              </CardDescription>
            </motion.div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              <div>
                <Label className="text-base font-medium">Search for any location in India</Label>
                <LocationAutocomplete 
                  onLocationSelect={handleLocationSelect}
                  placeholder="Type city name, village, or area..."
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <span className="text-sm text-muted-foreground">or choose from popular cities</span>
            </motion.div>

            {/* Quick Select Major Cities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad"].map((city, index) => (
                  <motion.div
                    key={city}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full h-12 hover:shadow-lg transition-all duration-300 hover:scale-105"
                      onClick={() => handleQuickSelect(city)}
                      disabled={isLoading}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {city}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg"
            >
              🔒 Your location data is encrypted and used only for providing relevant disaster alerts. 
              We never share your information with third parties.
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};