import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisasterIcon, DisasterType } from "./DisasterIcon";
import { DisasterAlert } from "@/services/weatherService";
import { Clock, MapPin, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AlertCardProps {
  alert: DisasterAlert;
  onViewDetails: () => void;
  onGetPrecautions: () => void;
}

export const AlertCard = ({ alert, onViewDetails, onGetPrecautions }: AlertCardProps) => {
  const getSeverityVariant = () => {
    switch (alert.severity) {
      case 'low':
        return 'secondary';
      case 'medium':
        return 'caution' as any;
      case 'high':
        return 'danger' as any;
      default:
        return 'secondary';
    }
  };

  const getSeverityColor = () => {
    switch (alert.severity) {
      case 'low':
        return 'text-muted-foreground';
      case 'medium':
        return 'text-caution';
      case 'high':
        return 'text-danger';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className={`border-l-4 ${
      alert.severity === 'high' ? 'border-l-danger' :
      alert.severity === 'medium' ? 'border-l-caution' :
      'border-l-primary'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <DisasterIcon 
              type={alert.type as DisasterType} 
              size={32}
            />
            <div>
              <CardTitle className="text-lg capitalize">
                {alert.type} Alert
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <MapPin className="h-3 w-3" />
                {alert.location}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={getSeverityVariant()}
            className="capitalize"
          >
            {alert.severity}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-foreground leading-relaxed">
            {alert.description}
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
          </span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={onViewDetails}
          >
            <AlertTriangle className="h-3 w-3 mr-2" />
            Details
          </Button>
          <Button 
            variant={alert.severity === 'high' ? 'danger' : 'default'}
            size="sm" 
            className="flex-1"
            onClick={onGetPrecautions}
          >
            Get Precautions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};