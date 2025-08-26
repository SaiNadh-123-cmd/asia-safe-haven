
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
import { BookOpen, RefreshCw, Users, Heart } from "lucide-react";

interface StoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  disaster: DisasterType;
  location: string;
}

export const StoriesModal = ({ isOpen, onClose, disaster, location }: StoriesModalProps) => {
  const [story, setStory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [storyId, setStoryId] = useState<string>("");
  const disasterInfo = getDisasterInfo(disaster);

  const generateStory = async () => {
    setIsLoading(true);
    try {
      console.log(`Generating fresh story for ${disaster} in ${location}`);
      const generated = await aiService.generateStory(disaster, location);
      setStory(generated);
      setStoryId(`${disaster}-${location}-${Date.now()}`); // Unique ID for each story
    } catch (error) {
      console.error('Error generating story:', error);
      setStory("Unable to generate story at this time. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Always generate a fresh story when modal opens
      setStory(""); // Clear previous story
      generateStory();
    }
  }, [isOpen, disaster, location]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <DisasterIcon type={disaster} size={32} />
            <div>
              <DialogTitle className="text-xl">
                Survival Stories: {disasterInfo.name}
              </DialogTitle>
              <DialogDescription>
                AI-generated stories based on historical patterns from {location}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="capitalize">
              <BookOpen className="h-3 w-3 mr-1" />
              AI-Generated Story
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateStory}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              New Story
            </Button>
          </div>

          <Separator />

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Generating inspiring survival story for {disaster} in {location}...
              </div>
            </div>
          ) : (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Community Resilience Story - {location}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {story ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-line">
                      {story}
                    </p>
                    {storyId && (
                      <div className="mt-4 text-xs text-muted-foreground border-t pt-2">
                        Story ID: {storyId} | Disaster: {disaster} | Location: {location}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No story available at the moment.</p>
                    <Button 
                      variant="outline" 
                      onClick={generateStory}
                      className="mt-2"
                    >
                      Generate Story
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary font-medium mb-2">
              <Heart className="h-4 w-4" />
              AI-Generated Content Disclaimer
            </div>
            <p className="text-sm text-muted-foreground">
              These stories are AI-generated based on historical disaster patterns and survival accounts from {location} and similar regions. 
              They aim to inspire preparedness and highlight human resilience. Each story is uniquely generated and may vary with each request.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-semibold text-primary">Community</div>
              <div className="text-muted-foreground">People helping people</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-semibold text-primary">Preparedness</div>
              <div className="text-muted-foreground">Planning saves lives</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-semibold text-primary">Resilience</div>
              <div className="text-muted-foreground">Strength in adversity</div>
            </div>
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
