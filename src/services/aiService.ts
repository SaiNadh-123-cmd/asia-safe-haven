
import { supabase } from '@/integrations/supabase/client';

class AIService {
  private isInitialized = true; // Always ready since we use Edge Functions

  async generatePrecautions(disaster: string, location: string, active: boolean = true): Promise<string[]> {
    try {
      console.log(`Calling precautions API for ${disaster} in ${location} (active: ${active})`);
      
      const { data, error } = await supabase.functions.invoke('generate-precautions', {
        body: { disaster, location, active }
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
      
      // Add timestamp to prevent caching and ensure fresh generation
      const timestamp = Date.now();
      const { data, error } = await supabase.functions.invoke('generate-stories', {
        body: { 
          disaster, 
          location,
          timestamp,
          requestId: `story-${disaster}-${location}-${timestamp}`
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        return this.getFallbackStory(disaster, location);
      }

      console.log('Stories response:', data);
      
      // Ensure we have a valid story response
      if (!data || !data.story) {
        console.warn('No story in response, using fallback');
        return this.getFallbackStory(disaster, location);
      }

      // Log the source to track AI vs fallback usage
      if (data.source) {
        console.log(`Story source: ${data.source}`);
      }

      return data.story;
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
      storm: [
        "Secure outdoor furniture and loose objects that could become projectiles",
        "Stay indoors and away from windows during high winds",
        "Stock emergency supplies: water, food, flashlight, battery-powered radio",
        "Avoid electrical appliances during lightning storms",
        "Keep trees trimmed and clear gutters to prevent damage"
      ],
      wildfire: [
        "Create defensible space around your home by clearing vegetation",
        "Have an evacuation plan and multiple escape routes ready",
        "Keep emergency supplies packed: documents, medications, water",
        "Install smoke detectors and check batteries regularly",
        "Never ignore evacuation orders - leave immediately when advised"
      ],
      drought: [
        "Conserve water by fixing leaks and using water-efficient fixtures",
        "Store emergency water supplies - 1 gallon per person per day",
        "Protect crops and gardens with mulch and efficient irrigation",
        "Monitor air quality as drought increases dust and fire risk",
        "Prepare for increased fire danger by clearing dry vegetation"
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
    // Dynamic fallback stories with location and disaster-specific content
    const stories: { [key: string]: string[] } = {
      flood: [
        `During the devastating floods in ${location}, residents helped each other by forming human chains to evacuate elderly people. They used boats and makeshift rafts to rescue families trapped on rooftops. The community center became a safe haven where everyone shared food and supplies while waiting for rescue teams.`,
        `When flood waters rose in ${location}, local volunteers organized boat rescues for stranded families. Neighbors opened their higher-floor homes as temporary shelters, while community leaders coordinated with emergency services. Their quick thinking and cooperation saved many lives.`,
        `The unexpected flooding in ${location} brought out incredible community spirit. Residents with boats immediately began rescue operations, while others prepared emergency shelters. The coordinated effort and willingness to help strangers made all the difference during the crisis.`
      ],
      earthquake: [
        `When the earthquake struck ${location}, quick-thinking residents immediately took cover under sturdy desks and tables. After the shaking stopped, they carefully evacuated buildings and gathered in open areas. Neighbors helped locate missing people and provided first aid to the injured until emergency services arrived.`,
        `During the powerful earthquake in ${location}, the community's preparedness training proved invaluable. Residents followed safety protocols, then quickly organized search and rescue teams. Their knowledge of the local area helped professional rescuers locate trapped individuals efficiently.`,
        `The earthquake in ${location} tested everyone's resolve, but the community responded with remarkable courage. Trained volunteers helped guide evacuations while others provided medical assistance. Their coordinated response and mutual support helped minimize casualties.`
      ],
      cyclone: [
        `As the cyclone approached ${location}, families secured their homes and moved to designated shelter areas. They brought essential supplies and helped elderly residents reach safety. Throughout the storm, people stayed together, sharing resources and keeping spirits up until the danger passed.`,
        `When the cyclone hit ${location}, the community's emergency plan swung into action. Residents evacuated to reinforced buildings while volunteers ensured everyone had food and water. The storm was fierce, but their preparation and teamwork kept everyone safe.`,
        `The cyclone threatening ${location} saw an incredible display of community cooperation. Neighbors helped board up windows and secure property before moving to shelters together. Their advance planning and mutual support helped everyone weather the storm safely.`
      ],
      storm: [
        `During the severe storm in ${location}, residents quickly secured outdoor furniture and prepared for power outages. Neighbors worked together to help elderly residents secure their properties and move to safer areas. Emergency supplies and communication helped everyone stay safe through the night.`,
        `When the storm hit ${location}, the community's preparation showed. Residents with generators shared power for essential needs while others provided shelter for families whose homes were damaged. The coordinated response minimized injuries and property damage.`,
        `The unexpected storm in ${location} brought communities together as residents helped each other board up windows and clear debris. Quick action and mutual support helped everyone weather the dangerous winds and flooding safely.`
      ],
      wildfire: [
        `As wildfires approached ${location}, the community executed well-rehearsed evacuation plans. Residents with large vehicles helped transport those without means while firefighters coordinated defense efforts. The early warning system and community cooperation saved lives and property.`,
        `The wildfire threat to ${location} saw incredible bravery as residents followed evacuation orders and helped others reach safety. Emergency coordination centers kept families connected while first responders battled the flames. Preparation and teamwork prevented casualties.`,
        `When wildfires surrounded ${location}, residents relied on their emergency plans and community networks. Evacuation routes were kept clear while volunteers assisted with livestock and pet rescue. The organized response helped everyone escape safely.`
      ],
      drought: [
        `During the prolonged drought in ${location}, communities implemented water conservation measures and shared resources. Residents with wells provided water to neighbors while local authorities coordinated distribution. The collective effort helped everyone through the water shortage.`,
        `The severe drought affecting ${location} brought out community resilience as people shared water supplies and implemented conservation practices. Agricultural communities pooled resources while urban areas established distribution points. Cooperation helped minimize the impact.`,
        `When drought struck ${location}, the community organized water distribution and conservation programs. Residents modified their routines and shared resources while authorities implemented emergency measures. The unified response helped protect essential services.`
      ],
      heatwave: [
        `During the extreme heatwave in ${location}, communities opened cooling centers and distributed water to vulnerable residents. People checked on their neighbors regularly and shared ice and cool drinks. Many lives were saved through collective care and early warning systems.`,
        `The severe heat in ${location} prompted neighbors to create informal cooling networks. Those with air conditioning welcomed others, while volunteers delivered water to elderly residents. The community's care for its most vulnerable members prevented heat-related tragedies.`,
        `When temperatures soared in ${location}, residents organized to protect each other from the heat. Community centers became cooling refuges while volunteers made regular wellness checks. The collective response and shared resources helped everyone survive the dangerous conditions.`
      ],
      tsunami: [
        `When the tsunami warning sounded in ${location}, residents immediately moved to higher ground. Local fishermen used their knowledge to guide tourists to safety. The quick evacuation and community cooperation helped minimize casualties as everyone worked together to reach designated safe zones.`,
        `The tsunami threat to ${location} activated well-rehearsed evacuation procedures. Community leaders coordinated transport for those unable to walk while residents helped visitors understand the urgency. Everyone reached safety zones well before the waves could arrive.`,
        `During the tsunami evacuation in ${location}, the community's preparedness and mutual aid shone through. Coastal residents guided others to evacuation routes while emergency coordinators ensured no one was left behind. Their practiced response and teamwork saved lives.`
      ]
    };
    
    // Select story based on disaster type and add some variation
    const disasterStories = stories[disaster.toLowerCase()] || stories.flood;
    const storyIndex = Math.abs(location.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % disasterStories.length;
    
    return disasterStories[storyIndex];
  }
}

export const aiService = new AIService();
