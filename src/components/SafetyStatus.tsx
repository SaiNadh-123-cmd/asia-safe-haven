import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, ShieldX, AlertTriangle, Eye } from "lucide-react";
import { WeatherData } from "@/services/weatherService";

interface SafetyStatusProps {
  weatherData: WeatherData;
  onViewPrecautions: () => void;
  onViewStories: () => void;
}

export const SafetyStatus = ({ weatherData, onViewPrecautions, onViewStories }: SafetyStatusProps) => {
  const getSafetyIcon = () => {
    switch (weatherData.safetyLevel) {
      case 'safe':
        return <Shield className="h-12 w-12 text-safe" />;
      case 'caution':
        return <ShieldAlert className="h-12 w-12 text-caution" />;
      case 'danger':
        return <ShieldX className="h-12 w-12 text-danger" />;
    }
  };

  const getSafetyMessage = () => {
    switch (weatherData.safetyLevel) {
      case 'safe':
        return 'All Clear - Conditions are safe';
      case 'caution':
        return 'Stay Alert - Monitor conditions closely';
      case 'danger':
        return 'High Risk - Take immediate precautions';
    }
  };

  const getSafetyColor = () => {
    switch (weatherData.safetyLevel) {
      case 'safe':
        return 'safe';
      case 'caution':
        return 'caution';
      case 'danger':
        return 'danger';
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-${getSafetyColor()} opacity-5`} />
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4">
          {getSafetyIcon()}
        </div>
        <CardTitle className="text-2xl font-bold">
          Safety Status
        </CardTitle>
        <CardDescription className="text-lg font-medium">
          {weatherData.city}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="text-center space-y-4">
        <div className="space-y-2">
          <Badge 
            variant="secondary" 
            className={`text-lg px-4 py-2 bg-${getSafetyColor()} text-${getSafetyColor()}-foreground`}
          >
            {getSafetyMessage()}
          </Badge>
          
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-2xl">{weatherData.temperature}°C</div>
              <div className="text-muted-foreground">Temperature</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-2xl">{weatherData.humidity}%</div>
              <div className="text-muted-foreground">Humidity</div>
            </div>
          </div>
          
          <div className="text-center mt-2">
            <div className="text-muted-foreground text-sm">{weatherData.description}</div>
            <div className="text-muted-foreground text-sm">Wind: {weatherData.windSpeed} km/h</div>
          </div>
        </div>

        {weatherData.warnings && weatherData.warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-caution">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Active Warnings</span>
            </div>
            <div className="space-y-1">
              {weatherData.warnings.slice(0, 2).map((warning, index) => (
                <div key={index} className="text-sm text-muted-foreground bg-caution/10 rounded px-2 py-1">
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={onViewPrecautions}
          >
            <Shield className="h-4 w-4 mr-2" />
            Precautions
          </Button>
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={onViewStories}
          >
            <Eye className="h-4 w-4 mr-2" />
            Stories
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};