import { supabase } from '@/integrations/supabase/client';

class AIService {
  private isInitialized = true; // Always ready since we use Edge Functions

  async generatePrecautions(disaster: string, location: string): Promise<string[]> {
    try {
      console.log(`Calling precautions API for ${disaster} in ${location}`);
      
      const { data, error } = await supabase.functions.invoke('generate-precautions', {
        body: { disaster, location }
      });

      if (error) {
        console.error('Supabase function error:', error);
        return this.getFallbackPrecautions(disaster);
      }

      console.log('Precautions response:', data);
      return data.precautions || this.getFallbackPrecautions(disaster);
    } catch (error) {
      console.error('Error calling precautions function:', error);
      return this.getFallbackPrecautions(disaster);
    }
  }

  async generateStory(disaster: string, location: string): Promise<string> {
    try {
      console.log(`Calling stories API for ${disaster} in ${location}`);
      
      const { data, error } = await supabase.functions.invoke('generate-stories', {
        body: { disaster, location }
      });

      if (error) {
        console.error('Supabase function error:', error);
        return this.getFallbackStory(disaster, location);
      }

      console.log('Stories response:', data);
      return data.story || this.getFallbackStory(disaster, location);
    } catch (error) {
      console.error('Error calling stories function:', error);
      return this.getFallbackStory(disaster, location);
    }
  }


  private getFallbackPrecautions(disaster: string): string[] {
    const fallbacks: { [key: string]: string[] } = {
      flood: [
        "Move to higher ground immediately",
        "Avoid walking or driving through flood waters",
        "Keep emergency supplies and important documents ready",
        "Stay informed through official weather alerts",
        "Turn off electricity and gas if advised"
      ],
      earthquake: [
        "Drop, Cover, and Hold On during shaking",
        "Stay away from windows and heavy objects",
        "Have an emergency kit with food and water",
        "Know your evacuation routes",
        "Secure heavy furniture to walls"
      ],
      cyclone: [
        "Stay indoors and away from windows",
        "Stock up on food, water, and batteries",
        "Secure outdoor objects that could become projectiles",
        "Follow evacuation orders if issued",
        "Avoid using electrical appliances during the storm"
      ],
      heatwave: [
        "Stay indoors during peak heat hours",
        "Drink plenty of water regularly",
        "Wear lightweight, light-colored clothing",
        "Use fans or air conditioning if available",
        "Check on elderly neighbors and relatives"
      ],
      tsunami: [
        "Move to higher ground or inland immediately",
        "Do not wait for official warnings if you feel an earthquake",
        "Stay away from beaches and coastal areas",
        "Listen to emergency broadcasts",
        "Do not return until authorities declare it safe"
      ]
    };
    
    return fallbacks[disaster.toLowerCase()] || fallbacks.flood;
  }

  private getFallbackStory(disaster: string, location: string): string {
    const stories: { [key: string]: string } = {
      flood: `During the devastating floods in ${location}, residents helped each other by forming human chains to evacuate elderly people. They used boats and makeshift rafts to rescue families trapped on rooftops. The community center became a safe haven where everyone shared food and supplies while waiting for rescue teams.`,
      earthquake: `When the earthquake struck ${location}, quick-thinking residents immediately took cover under sturdy desks and tables. After the shaking stopped, they carefully evacuated buildings and gathered in open areas. Neighbors helped locate missing people and provided first aid to the injured until emergency services arrived.`,
      cyclone: `As the cyclone approached ${location}, families secured their homes and moved to designated shelter areas. They brought essential supplies and helped elderly residents reach safety. Throughout the storm, people stayed together, sharing resources and keeping spirits up until the danger passed.`,
      heatwave: `During the extreme heatwave in ${location}, communities opened cooling centers and distributed water to vulnerable residents. People checked on their neighbors regularly and shared ice and cool drinks. Many lives were saved through collective care and early warning systems.`,
      tsunami: `When the tsunami warning sounded in ${location}, residents immediately moved to higher ground. Local fishermen used their knowledge to guide tourists to safety. The quick evacuation and community cooperation helped minimize casualties as everyone worked together to reach designated safe zones.`
    };
    
    return stories[disaster.toLowerCase()] || stories.flood;
  }
}

export const aiService = new AIService();