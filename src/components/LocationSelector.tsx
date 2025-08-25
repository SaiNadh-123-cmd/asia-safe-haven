import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Globe } from "lucide-react";

interface LocationSelectorProps {
  onLocationSelect: (location: string) => void;
}

export const LocationSelector = ({ onLocationSelect }: LocationSelectorProps) => {
  const [selectedCountry, setSelectedCountry] = useState("India");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [customLocation, setCustomLocation] = useState("");

  const countries = ["India", "Bangladesh", "Nepal", "Sri Lanka", "Myanmar"];
  
  const indianStates = [
    "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "West Bengal",
    "Gujarat", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh", "Bihar",
    "Odisha", "Kerala", "Assam", "Punjab", "Haryana", "Jharkhand",
    "Uttarakhand", "Himachal Pradesh", "Tripura", "Meghalaya"
  ];

  const majorCities = {
    "Delhi": ["New Delhi", "Delhi", "Gurgaon", "Noida", "Faridabad"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Aurangabad", "Nashik"],
    "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"]
  };

  const handleLocationSubmit = () => {
    if (customLocation.trim()) {
      onLocationSelect(customLocation.trim());
    } else if (selectedCity) {
      onLocationSelect(selectedCity);
    } else if (selectedState) {
      onLocationSelect(selectedState);
    } else {
      onLocationSelect(selectedCountry);
    }
  };

  const handleQuickSelect = (city: string) => {
    onLocationSelect(city);
  };

  const requestGeolocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // For demo purposes, use a nearby major city
          const nearbyCity = "Delhi"; // In production, use reverse geocoding
          onLocationSelect(nearbyCity);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to get your location. Please select manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-hero flex items-center justify-center">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Welcome to DisasterAlert</CardTitle>
          <CardDescription>
            Select your location to receive personalized disaster alerts and safety information
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Quick Location Access */}
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-12"
              onClick={requestGeolocation}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Use My Current Location
            </Button>
            
            <div className="text-center">
              <span className="text-sm text-muted-foreground">or choose manually</span>
            </div>
          </div>

          {/* Manual Location Selection */}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCountry === "India" && (
              <div>
                <Label htmlFor="state">State</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {indianStates.map(state => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedState && majorCities[selectedState as keyof typeof majorCities] && (
              <div>
                <Label htmlFor="city">City</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {majorCities[selectedState as keyof typeof majorCities].map(city => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="custom">Or enter custom location</Label>
              <Input
                id="custom"
                placeholder="Enter your city/area name"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Select Major Cities */}
          <div className="space-y-3">
            <Label>Quick Select - Major Cities</Label>
            <div className="grid grid-cols-2 gap-2">
              {["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad"].map(city => (
                <Button
                  key={city}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(city)}
                >
                  {city}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full h-12 bg-gradient-hero hover:shadow-glow"
            onClick={handleLocationSubmit}
            disabled={!customLocation && !selectedCity && !selectedState}
          >
            <Globe className="h-4 w-4 mr-2" />
            Continue to Dashboard
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            Your location data is used only for providing relevant disaster alerts and will not be shared with third parties.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};