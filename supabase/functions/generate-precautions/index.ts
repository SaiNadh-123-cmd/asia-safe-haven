import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PrecautionRequest {
  disaster: string;
  location: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { disaster, location }: PrecautionRequest = await req.json();
    
    console.log(`Generating precautions for ${disaster} in ${location}`);

    const huggingFaceApiKey = Deno.env.get('HUGGING_FACE_API_KEY');
    if (!huggingFaceApiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    // Create dynamic prompt for precautions
    const prompt = `Generate 5 essential safety precautions for surviving a ${disaster} in ${location}. Focus on immediate actions and safety measures. Format as a numbered list:

1.`;

    const response = await fetch('https://api-inference.huggingface.co/models/reedmayhew/PocketSurvivor-3B', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${huggingFaceApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
          do_sample: true,
          return_full_text: false
        }
      }),
    });

    if (!response.ok) {
      console.error('Hugging Face API error:', response.status, await response.text());
      // Fallback to disaster-specific precautions
      return new Response(JSON.stringify({ 
        precautions: getFallbackPrecautions(disaster),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('AI Response:', result);

    // Extract precautions from generated text
    let generatedText = '';
    if (Array.isArray(result)) {
      generatedText = result[0]?.generated_text || '';
    } else if (result.generated_text) {
      generatedText = result.generated_text;
    }

    const precautions = extractPrecautions(generatedText, prompt);
    
    if (precautions.length === 0) {
      return new Response(JSON.stringify({ 
        precautions: getFallbackPrecautions(disaster),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      precautions,
      source: 'ai'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-precautions function:', error);
    
    // Extract disaster type from request body if available
    let disaster = 'flood';
    try {
      const body = await req.clone().json();
      disaster = body.disaster || 'flood';
    } catch (e) {
      console.log('Could not parse request body for fallback');
    }

    return new Response(JSON.stringify({ 
      precautions: getFallbackPrecautions(disaster),
      source: 'fallback',
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 with fallback data instead of error
    });
  }
});

function extractPrecautions(text: string, prompt: string): string[] {
  const content = text.replace(prompt, '').trim();
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  const precautions: string[] = [];
  lines.forEach(line => {
    const cleaned = line.replace(/^\d+\.?\s*/, '').replace(/^[-•]\s*/, '').trim();
    if (cleaned.length > 10 && cleaned.length < 200) {
      precautions.push(cleaned);
    }
  });
  
  return precautions.slice(0, 5);
}

function getFallbackPrecautions(disaster: string): string[] {
  const fallbacks: { [key: string]: string[] } = {
    flood: [
      "Move to higher ground immediately and avoid low-lying areas",
      "Never walk or drive through flood waters - even 6 inches can knock you down",
      "Keep emergency supplies ready: water, food, flashlight, and first aid kit",
      "Stay informed through weather alerts and official emergency broadcasts",
      "Turn off electricity and gas at main switches if advised by authorities"
    ],
    earthquake: [
      "Drop, Cover, and Hold On - get under a sturdy desk or table",
      "Stay away from windows, mirrors, and heavy objects that could fall",
      "If outdoors, move away from buildings, trees, and power lines",
      "Keep emergency supplies accessible: water, food, flashlight, radio",
      "Know your evacuation routes and family meeting points"
    ],
    cyclone: [
      "Stay indoors and away from windows during the storm",
      "Stock up on non-perishable food, water, batteries, and medicines",
      "Secure outdoor furniture and objects that could become projectiles",
      "Listen to weather updates and follow evacuation orders immediately",
      "Avoid using electrical appliances during thunder and lightning"
    ],
    heatwave: [
      "Stay indoors during peak heat hours (10 AM to 4 PM)",
      "Drink water regularly, even if you don't feel thirsty",
      "Wear light-colored, loose-fitting, breathable clothing",
      "Use fans, air conditioning, or visit cooling centers",
      "Check on elderly relatives and neighbors frequently"
    ],
    tsunami: [
      "Move to higher ground or inland immediately upon warning",
      "Don't wait for official warnings if you feel strong earthquake",
      "Stay away from beaches and coastal areas until all-clear given",
      "Listen to emergency broadcasts for evacuation instructions",
      "Never go to the beach to watch tsunami waves approach"
    ]
  };
  
  return fallbacks[disaster.toLowerCase()] || fallbacks.flood;
}