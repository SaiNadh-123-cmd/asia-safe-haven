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
import { DisasterIcon, DisasterType, getDisasterInfo } from "./DisasterIcon";
import { aiService } from "@/services/aiService";
import { Shield, RefreshCw, CheckCircle } from "lucide-react";

interface PrecautionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  disaster: DisasterType;
  location: string;
}

export const PrecautionsModal = ({ isOpen, onClose, disaster, location }: PrecautionsModalProps) => {
  const [precautions, setPrecautions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const disasterInfo = getDisasterInfo(disaster);

  const generatePrecautions = async () => {
    setIsLoading(true);
    try {
      const generated = await aiService.generatePrecautions(disaster, location);
      setPrecautions(generated);
    } catch (error) {
      console.error('Error generating precautions:', error);
      setPrecautions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && precautions.length === 0) {
      generatePrecautions();
    }
  }, [isOpen, disaster, location]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <DisasterIcon type={disaster} size={32} />
            <div>
              <DialogTitle className="text-xl">
                {disasterInfo.name} Safety Precautions
              </DialogTitle>
              <DialogDescription>
                Essential safety measures for {location}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="capitalize">
              AI-Generated Safety Guide
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={generatePrecautions}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <Separator />

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Generating personalized precautions...
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Shield className="h-5 w-5" />
                Essential Safety Measures
              </div>
              
              <div className="space-y-3">
                {precautions.map((precaution, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border"
                  >
                    <CheckCircle className="h-5 w-5 text-safe mt-0.5 flex-shrink-0" />
                    <div className="text-sm leading-relaxed">
                      {precaution}
                    </div>
                  </div>
                ))}
              </div>

              {precautions.length === 0 && !isLoading && (
                <div className="text-center py-6 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No precautions available at the moment.</p>
                  <Button 
                    variant="outline" 
                    onClick={generatePrecautions}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="bg-caution/10 border border-caution/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-caution font-medium mb-2">
              <Shield className="h-4 w-4" />
              Important Note
            </div>
            <p className="text-sm text-muted-foreground">
              These precautions are AI-generated based on general safety guidelines. 
              Always follow official emergency services recommendations and local authorities' instructions.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};