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
    
    console.log(`Generating survival story for ${disaster} in ${location}`);

    const huggingFaceApiKey = Deno.env.get('HUGGING_FACE_API_KEY');
    if (!huggingFaceApiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    // Create dynamic prompt for survival stories
    const prompt = `Write a short, inspiring survival story about how people escaped a ${disaster} in ${location}. Focus on key actions, community cooperation, and resilience. The story should be realistic and educational:

During the ${disaster} in ${location},`;

    // Try primary model first, then fallback
    let response = await tryModel('google/gemma-2-2b-it', prompt, huggingFaceApiKey);
    
    if (!response.ok) {
      console.log('Primary model failed, trying fallback...');
      response = await tryModel('microsoft/DialoGPT-medium', prompt, huggingFaceApiKey);
    }

    if (!response.ok) {
      console.error('All AI models failed, using fallback story');
      return new Response(JSON.stringify({ 
        story: getFallbackStory(disaster, location),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('AI Response:', result);

    // Extract story from generated text
    let generatedText = '';
    if (Array.isArray(result)) {
      generatedText = result[0]?.generated_text || '';
    } else if (result.generated_text) {
      generatedText = result.generated_text;
    }

    const story = extractStory(generatedText, prompt);
    
    if (!story || story.length < 50) {
      return new Response(JSON.stringify({ 
        story: getFallbackStory(disaster, location),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      story,
      source: 'ai'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-stories function:', error);
    
    // Extract disaster and location from request body if available
    let disaster = 'flood';
    let location = 'the region';
    try {
      const body = await req.clone().json();
      disaster = body.disaster || 'flood';
      location = body.location || 'the region';
    } catch (e) {
      console.log('Could not parse request body for fallback');
    }

    return new Response(JSON.stringify({ 
      story: getFallbackStory(disaster, location),
      source: 'fallback',
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 with fallback data instead of error
    });
  }
});

async function tryModel(model: string, prompt: string, apiKey: string) {
  return await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 250,
        temperature: 0.8,
        do_sample: true,
        return_full_text: false
      }
    }),
  });
}

function extractStory(text: string, prompt: string): string {
  let story = text.replace(prompt, '').trim();
  
  // Clean up the story
  story = story.replace(/^During the .* in .*, /, '');
  story = story.replace(/\n+/g, ' ');
  story = story.trim();
  
  // Limit length for readability
  if (story.length > 500) {
    const sentences = story.split('. ');
    story = sentences.slice(0, 4).join('. ');
    if (!story.endsWith('.')) story += '.';
  }
  
  return story;
}

function getFallbackStory(disaster: string, location: string): string {
  const stories: { [key: string]: string } = {
    flood: `During the devastating floods in ${location}, the community quickly organized rescue efforts. Residents used boats and makeshift rafts to help elderly neighbors reach safety. Local volunteers set up a shelter in the community center, sharing food and supplies. People formed human chains to guide families through safe evacuation routes, with everyone looking out for each other until emergency services arrived.`,
    
    earthquake: `When the earthquake struck ${location}, residents immediately followed safety protocols. They took cover under sturdy furniture and stayed calm. After the shaking stopped, neighbors quickly checked on each other and helped rescue people trapped in collapsed areas. The community gathered in open spaces, sharing water and first aid supplies while coordinating with rescue teams to locate missing persons.`,
    
    cyclone: `As the cyclone approached ${location}, families worked together to secure their homes and move to designated shelters. Community leaders organized supply distribution and helped vulnerable residents reach safety. During the storm, people supported each other with food, medicine, and comfort. Local fishermen used their weather knowledge to guide others to the safest locations until the danger passed.`,
    
    heatwave: `During the extreme heatwave in ${location}, the community opened cooling centers and distributed water to those in need. Neighbors regularly checked on elderly residents and families with young children. Volunteers organized ice distribution and set up shaded rest areas. Local shops provided free cold drinks, and everyone worked together to ensure no one suffered from heat-related illness.`,
    
    tsunami: `When tsunami warnings were issued for ${location}, coastal residents immediately moved inland to higher ground. Local leaders quickly organized evacuation buses and guided tourists to safety zones. Fishermen used their knowledge of the sea to help others understand the danger. The community worked together, ensuring everyone reached designated safe areas well before the waves arrived.`
  };
  
  return stories[disaster.toLowerCase()] || stories.flood.replace(disaster, 'disaster');
}