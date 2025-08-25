import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisasterIcon, DisasterType, getDisasterInfo } from "./DisasterIcon";
import { Badge } from "@/components/ui/badge";

interface DisasterGridProps {
  onDisasterSelect: (disaster: DisasterType) => void;
}

export const DisasterGrid = ({ onDisasterSelect }: DisasterGridProps) => {
  const disasters: DisasterType[] = [
    'flood',
    'earthquake', 
    'cyclone',
    'heatwave',
    'tsunami',
    'storm',
    'fire',
    'drought'
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Disaster Preparedness</h2>
        <p className="text-muted-foreground">Learn about different types of disasters and how to stay safe</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {disasters.map((disaster) => {
          const info = getDisasterInfo(disaster);
          
          return (
            <Card 
              key={disaster}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => onDisasterSelect(disaster)}
            >
              <CardHeader className="pb-3">
                <div className="mx-auto mb-2">
                  <DisasterIcon type={disaster} size={48} />
                </div>
                <CardTitle className="text-center text-base">
                  {info.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    {info.description}
                  </p>
                  
                  <Badge 
                    variant="outline"
                    className="text-xs"
                  >
                    Learn More
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};