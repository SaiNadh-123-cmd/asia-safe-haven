
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoryRequest {
  disaster: string;
  location: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { disaster, location }: StoryRequest = await req.json();
    
    console.log(`Generating dynamic survival story for ${disaster} in ${location}`);

    const huggingFaceApiKey = Deno.env.get('HUGGING_FACE_API_KEY');
    if (!huggingFaceApiKey) {
      console.error('Hugging Face API key not configured');
      return new Response(JSON.stringify({ 
        story: getFallbackStory(disaster, location),
        source: 'fallback_no_key'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create dynamic, specific prompt for story generation
    const timestamp = Date.now();
    const prompt = `Write a short, inspiring survival story about how people escaped a ${disaster} in ${location}. Focus on specific actions, community cooperation, and resilience. The story should be realistic, educational, and unique. Include details about preparation, evacuation, and helping others.

Story about the ${disaster} in ${location}:`;

    console.log('Using dynamic prompt:', prompt);

    // Try primary model first
    let response = await tryModel('google/gemma-2-2b-it', prompt, huggingFaceApiKey, timestamp);
    
    if (!response.ok) {
      console.log('Primary model failed, trying alternative model...');
      response = await tryModel('microsoft/DialoGPT-medium', prompt, huggingFaceApiKey, timestamp);
    }

    if (!response.ok) {
      console.log('Alternative model also failed, trying third option...');
      response = await tryModel('HuggingFaceH4/zephyr-7b-beta', prompt, huggingFaceApiKey, timestamp);
    }

    if (!response.ok) {
      console.error('All AI models failed, using dynamic fallback story');
      return new Response(JSON.stringify({ 
        story: getFallbackStory(disaster, location),
        source: 'fallback_after_failure'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('AI Response received:', result);

    // Extract story from generated text
    let generatedText = '';
    if (Array.isArray(result)) {
      generatedText = result[0]?.generated_text || '';
    } else if (result.generated_text) {
      generatedText = result.generated_text;
    } else if (result[0]?.generated_text) {
      generatedText = result[0].generated_text;
    }

    const story = extractAndCleanStory(generatedText, prompt, disaster, location);
    
    if (!story || story.length < 50) {
      console.log('Generated story too short or empty, using fallback');
      return new Response(JSON.stringify({ 
        story: getFallbackStory(disaster, location),
        source: 'fallback_short_story'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully generated dynamic story:', story.substring(0, 100) + '...');

    return new Response(JSON.stringify({ 
      story,
      source: 'ai_generated',
      disaster_type: disaster,
      location: location
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-stories function:', error);
    
    // Extract disaster and location from request body if available
    let disaster = 'natural disaster';
    let location = 'the affected region';
    try {
      const body = await req.clone().json();
      disaster = body.disaster || 'natural disaster';
      location = body.location || 'the affected region';
    } catch (e) {
      console.log('Could not parse request body for fallback');
    }

    return new Response(JSON.stringify({ 
      story: getFallbackStory(disaster, location),
      source: 'fallback_error',
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 with fallback data instead of error
    });
  }
});

async function tryModel(model: string, prompt: string, apiKey: string, timestamp: number) {
  console.log(`Trying model: ${model}`);
  
  return await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Request-ID': `story-${timestamp}`, // Add unique identifier to prevent caching
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.9,
        do_sample: true,
        return_full_text: false,
        repetition_penalty: 1.1,
        top_p: 0.95
      }
    }),
  });
}

function extractAndCleanStory(text: string, prompt: string, disaster: string, location: string): string {
  let story = text;
  
  // Remove the prompt from the beginning if it's there
  if (story.includes(prompt)) {
    story = story.replace(prompt, '').trim();
  }
  
  // Clean up common AI artifacts
  story = story.replace(/^Story about the .* in .*:?\s*/i, '');
  story = story.replace(/^\s*[-*•]\s*/, ''); // Remove bullet points
  story = story.replace(/\n+/g, '\n'); // Normalize line breaks
  story = story.replace(/\s+/g, ' '); // Normalize spaces
  story = story.trim();
  
  // Ensure the story mentions the disaster type and location for context
  if (!story.toLowerCase().includes(disaster.toLowerCase()) && !story.toLowerCase().includes(location.toLowerCase())) {
    story = `During the ${disaster} in ${location}, ${story}`;
  }
  
  // Limit length for readability and ensure it ends properly
  if (story.length > 600) {
    const sentences = story.split(/[.!?]+/);
    story = sentences.slice(0, 4).join('. ').trim();
    if (!story.match(/[.!?]$/)) {
      story += '.';
    }
  }
  
  return story;
}

function getFallbackStory(disaster: string, location: string): string {
  const dynamicStories: { [key: string]: string[] } = {
    flood: [
      `During the severe flooding in ${location}, local residents quickly organized rescue boats to help stranded families. Community leaders coordinated evacuation routes to higher ground while volunteers distributed emergency supplies. The swift response and neighbors helping neighbors saved many lives until professional rescue teams arrived.`,
      `When flood waters rose rapidly in ${location}, the community center became a lifeline. Residents worked together to move elderly neighbors to safety, sharing boats and forming human chains through the waters. Their preparation and teamwork helped everyone reach the evacuation shelters safely.`,
      `The unexpected flood in ${location} brought out the best in people. Fishermen used their boats for rescue operations while shop owners opened their doors as temporary shelters. Through quick thinking and community cooperation, families were guided to safety on rooftops and higher buildings until help arrived.`
    ],
    
    earthquake: [
      `When the earthquake struck ${location}, residents immediately followed "Drop, Cover, Hold On" protocols. After the shaking stopped, neighbors quickly organized search teams to help trapped residents. The community's earthquake preparedness training and mutual aid networks proved crucial in the rescue efforts.`,
      `During the powerful earthquake in ${location}, local volunteers formed rescue teams to locate people trapped in collapsed buildings. Their knowledge of the area and pre-established emergency plans helped coordinate with professional rescuers to save lives in the critical first hours.`,
      `The earthquake in ${location} tested the community's resilience. Trained residents helped guide others to open areas away from buildings, while emergency coordinators activated communication networks to locate missing persons. Their preparedness and quick response prevented further casualties.`
    ],
    
    cyclone: [
      `As the cyclone approached ${location}, the community executed their evacuation plan with remarkable efficiency. Local leaders coordinated transport for vulnerable residents while others secured homes and moved to reinforced shelters. Their advance preparation and teamwork kept everyone safe through the storm.`,
      `During the intense cyclone in ${location}, residents who had prepared emergency supplies became lifelines for their neighbors. The community shelter became a hub of mutual support, with people sharing resources and caring for children while the storm passed overhead.`,
      `When the cyclone hit ${location}, the pre-positioned emergency supplies and well-rehearsed evacuation routes saved lives. Volunteers helped elderly residents reach the community center while others secured loose objects that could become dangerous projectiles.`
    ],
    
    heatwave: [
      `During the extreme heatwave in ${location}, community cooling centers became essential refuges. Neighbors regularly checked on elderly residents, while local organizations distributed water and ice. The network of care and shared resources helped vulnerable residents survive the dangerous temperatures.`,
      `The severe heatwave in ${location} brought people together in unexpected ways. Residents opened air-conditioned spaces to neighbors, while community groups organized water distribution points. Their collective response and care for the most vulnerable prevented heat-related emergencies.`,
      `When temperatures soared in ${location}, the community's heat emergency plan activated. Volunteers made wellness checks on isolated residents while cooling centers extended hours. The neighborhood watch system and mutual aid networks proved vital in protecting everyone from heat exhaustion.`
    ],
    
    tsunami: [
      `When the tsunami warning was issued for ${location}, the community's practiced evacuation procedures kicked into action. Residents moved quickly to designated high ground while coastal area coordinators ensured no one was left behind. Their preparation and orderly response saved countless lives.`,
      `The tsunami threat to ${location} showcased the power of community preparedness. Local fishermen used their knowledge of tides and currents to guide evacuations while emergency teams coordinated transport for those unable to walk to safety. Everyone reached the evacuation zones well before the waves arrived.`,
      `During the tsunami evacuation in ${location}, the community's early warning system and practiced drills paid off. Residents helped tourists and visitors understand the danger while volunteer coordinators ensured systematic evacuation to higher ground. The collective response prevented tragedy.`
    ]
  };
  
  // Get disaster-specific stories or use general ones
  const stories = dynamicStories[disaster.toLowerCase()] || dynamicStories.flood;
  
  // Select a story based on location hash to ensure some variety
  const locationHash = location.split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0);
  }, 0);
  
  const storyIndex = Math.abs(locationHash) % stories.length;
  return stories[storyIndex];
}
