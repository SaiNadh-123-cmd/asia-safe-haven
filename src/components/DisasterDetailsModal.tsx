import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisasterIcon, DisasterType, getDisasterInfo } from "./DisasterIcon";
import { aiService } from "@/services/aiService";
import { 
  AlertTriangle, 
  RefreshCw, 
  Calendar, 
  MapPin, 
  Info,
  Shield,
  BookOpen
} from "lucide-react";

interface DisasterDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  disaster: DisasterType;
  onViewPrecautions: () => void;
  onViewStories: () => void;
}

export const DisasterDetailsModal = ({ 
  isOpen, 
  onClose, 
  disaster, 
  onViewPrecautions,
  onViewStories 
}: DisasterDetailsModalProps) => {
  const [historicalEvents, setHistoricalEvents] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const disasterInfo = getDisasterInfo(disaster);

  const generateHistoricalInfo = async () => {
    setIsLoading(true);
    try {
      // For now, use fallback data as AI model might not be suitable for factual historical data
      setHistoricalEvents(getHistoricalEvents(disaster));
    } catch (error) {
      console.error('Error generating historical info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHistoricalEvents = (disasterType: DisasterType): string => {
    const events = {
      flood: `• 2013 Uttarakhand Floods - Affected over 4.2 million people in North India
• 2018 Kerala Floods - Displaced 1.4 million people, caused by extreme monsoon rainfall
• 2005 Mumbai Floods - 944mm rainfall in 24 hours, paralyzed the city
• 2014 Kashmir Floods - Affected 2.5 million people across Jammu & Kashmir
• 2019 Bihar Floods - Affected 13.42 million people across 12 districts`,
      
      earthquake: `• 2001 Gujarat Earthquake - Magnitude 7.7, killed over 20,000 people
• 1905 Kangra Earthquake - Magnitude 7.8, destroyed numerous villages in Himachal Pradesh
• 1950 Assam Earthquake - Magnitude 8.6, one of the strongest recorded earthquakes
• 1993 Latur Earthquake - Magnitude 6.2, affected Maharashtra severely
• 2011 Sikkim Earthquake - Magnitude 6.9, felt across North-East India and Nepal`,
      
      cyclone: `• 1999 Odisha Cyclone - Wind speeds up to 260 km/h, affected 15 million people
• 2019 Cyclone Fani - Extremely severe cyclonic storm, evacuated 1.2 million people
• 2020 Cyclone Amphan - Most powerful storm in Bay of Bengal, affected West Bengal
• 2014 Cyclone Hudhud - Caused widespread damage in Andhra Pradesh and Odisha
• 1970 Bhola Cyclone - Deadliest tropical cyclone on record in the region`,
      
      heatwave: `• 2015 Indian Heat Wave - Temperatures exceeded 48°C, killed over 2,500 people
• 2003 European Heat Wave - Showed global impact of extreme temperatures
• 2019 Bihar Heat Wave - Temperatures reached 45.8°C in several districts
• 2016 Rajasthan Heat Wave - Phalodi recorded India's highest temperature of 51°C
• 2022 Delhi Heat Wave - Early onset with temperatures crossing 46°C in March`,
      
      tsunami: `• 2004 Indian Ocean Tsunami - Affected Tamil Nadu and Andhra Pradesh coasts
• 1945 Makran Coast Tsunami - Affected western coast of India
• 2011 Tohoku Tsunami - Though Japan-based, showed global tsunami risk awareness
• Historical records show several smaller tsunamis along Indian coastlines
• Andaman and Nicobar Islands remain most tsunami-prone in India`,
      
      storm: `• 2019 Cyclone Vayu - Severe storm affecting Gujarat coast
• 2018 Titli Cyclone - Caused heavy damage in Odisha and Andhra Pradesh
• 2017 Cyclone Ockhi - Affected Kerala, Tamil Nadu, and Lakshadweep
• 2016 Cyclone Vardah - Made landfall near Chennai causing widespread damage
• 2015 Cyclone Komen - Heavy rainfall and flooding across eastern India`,
      
      fire: `• 2019 Amazon Fires - Global impact on climate and biodiversity
• 2020 Australian Bushfires - Showed importance of early warning systems
• Uttarakhand Forest Fires - Recurrent problem during summer months
• Odisha Forest Fires - Annual challenges during dry seasons
• Himalayan Forest Fires - Impact on ecosystem and air quality in northern India`,
      
      drought: `• 2012-2016 Maharashtra Drought - Affected over 330 districts across India
• 2015-16 Marathwada Drought - Severe water crisis in Maharashtra
• 2019 Chennai Water Crisis - Day Zero water situation in major city
• 2002-2003 Rajasthan Drought - Widespread crop failure and water scarcity
• 2009 India Drought - Weakest monsoon in 37 years affected agriculture`
    };
    
    return events[disasterType] || events.flood;
  };

  useEffect(() => {
    if (isOpen) {
      generateHistoricalInfo();
    }
  }, [isOpen, disaster]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <DisasterIcon type={disaster} size={40} />
            <div>
              <DialogTitle className="text-2xl">
                {disasterInfo.name} - Complete Guide
              </DialogTitle>
              <DialogDescription>
                Understanding, preparation, and response strategies
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5 text-primary" />
                  What is a {disasterInfo.name}?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed mb-3">
                  {disasterInfo.description}
                </p>
                <Badge variant="outline" className="text-xs">
                  {disasterInfo.severity}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-caution" />
                  Risk Level
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="font-medium mb-1">Primary Risks:</div>
                  <div className="text-muted-foreground">
                    {disaster === 'flood' && "Property damage, drowning, contamination"}
                    {disaster === 'earthquake' && "Building collapse, landslides, aftershocks"}
                    {disaster === 'cyclone' && "Wind damage, storm surge, flooding"}
                    {disaster === 'heatwave' && "Heat exhaustion, dehydration, heat stroke"}
                    {disaster === 'tsunami' && "Massive flooding, debris impact"}
                    {disaster === 'storm' && "Lightning, flooding, wind damage"}
                    {disaster === 'fire' && "Burns, smoke inhalation, rapid spread"}
                    {disaster === 'drought' && "Water scarcity, crop failure, health impacts"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Historical Events in India & Asia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading historical data...
                </div>
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-line">
                  {historicalEvents}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="hero"
              className="h-16"
              onClick={onViewPrecautions}
            >
              <Shield className="h-6 w-6 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Get Safety Precautions</div>
                <div className="text-sm opacity-90">AI-powered safety guide</div>
              </div>
            </Button>

            <Button 
              variant="outline"
              className="h-16"
              onClick={onViewStories}
            >
              <BookOpen className="h-6 w-6 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Read Survival Stories</div>
                <div className="text-sm text-muted-foreground">Learn from experiences</div>
              </div>
            </Button>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};