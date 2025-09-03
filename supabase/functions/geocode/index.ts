import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Remove duplicate functions and clean up the geocode edge function
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');

// Haversine distance calculation for accuracy verification
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Major Indian cities with coordinates for fallback
const cityDatabase = {
  'Delhi': { lat: 28.6139, lon: 77.2090, id: 42182 },
  'Mumbai': { lat: 19.0760, lon: 72.8777, id: 43003 },
  'Bangalore': { lat: 12.9716, lon: 77.5946, id: 43296 },
  'Chennai': { lat: 13.0827, lon: 80.2707, id: 43279 },
  'Kolkata': { lat: 22.5726, lon: 88.3639, id: 42809 },
  'Hyderabad': { lat: 17.3850, lon: 78.4867, id: 43128 },
};

// Find nearest IMD-supported city
function findNearestIMDCity(lat: number, lon: number): { name: string; distance: number; id: number } {
  let nearest = { name: 'Delhi', distance: Infinity, id: 42182 };
  
  Object.entries(cityDatabase).forEach(([cityName, cityData]) => {
    const distance = calculateDistance(lat, lon, cityData.lat, cityData.lon);
    if (distance < nearest.distance) {
      nearest = { name: cityName, distance, id: cityData.id };
    }
  });

  return nearest;
}

// Function to log errors to audit_logs
async function logError(action: string, details: any, userId?: string) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId || null,
        action,
        details: typeof details === 'string' ? { message: details } : details,
        timestamp: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to log error:', error);
    }
  } catch (e) {
    console.error('Failed to log error to audit_logs:', e);
  }
}

// Enhanced reverse geocoding with timeout handling
async function enhancedReverseGeocode(lat: number, lon: number): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.log('Reverse geocoding timeout after 5 seconds');
  }, 5000); // 5 second timeout

  try {
    console.log(`Starting reverse geocoding for coordinates: ${lat}, ${lon}`);
    
    // Try OpenWeatherMap reverse geocoding first (only if API key is available)
    if (OPENWEATHER_API_KEY) {
      try {
        console.log('Trying OpenWeatherMap reverse geocoding');
        const owmResponse = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`,
          { signal: controller.signal }
        );

        if (owmResponse.ok) {
          const owmData = await owmResponse.json();
          if (owmData && owmData.length > 0) {
            clearTimeout(timeoutId);
            const location = owmData[0];
            const result = {
              city: location.name,
              state: location.state,
              country: location.country,
              latitude: lat,
              longitude: lon
            };

            // Check if we need to snap to nearest IMD city
            const nearest = findNearestIMDCity(lat, lon);
            if (nearest.distance > 50) {
              result.cityId = nearest.id;
              result.distanceToNearestTown = nearest.distance;
              result.nearestTown = nearest.name;
            } else {
              // Check if current city is in IMD database
              const cityKey = Object.keys(cityDatabase).find(key => 
                key.toLowerCase() === result.city.toLowerCase()
              );
              if (cityKey) {
                result.cityId = cityDatabase[cityKey].id;
              }
            }

            console.log('OpenWeatherMap reverse geocoding successful');
            return result;
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('OpenWeatherMap reverse geocoding timed out');
        } else {
          console.log('OpenWeatherMap reverse geocoding failed:', error.message);
        }
      }
    }

    // Fallback to Nominatim with fresh timeout
    clearTimeout(timeoutId);
    const nominatimTimeout = setTimeout(() => controller.abort(), 5000);
    
    try {
      console.log('Trying Nominatim reverse geocoding');
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
        { signal: controller.signal }
      );

      if (nominatimResponse.ok) {
        const nominatimData = await nominatimResponse.json();
        if (nominatimData) {
          clearTimeout(nominatimTimeout);
          const result = {
            city: nominatimData.address?.city || nominatimData.address?.town || nominatimData.address?.village || 'Unknown',
            state: nominatimData.address?.state,
            country: nominatimData.address?.country || 'India',
            latitude: lat,
            longitude: lon
          };

          // Always check for nearest IMD city for Nominatim results
          const nearest = findNearestIMDCity(lat, lon);
          if (nearest.distance > 50) {
            result.cityId = nearest.id;
            result.distanceToNearestTown = nearest.distance;
            result.nearestTown = nearest.name;
          }

          console.log('Nominatim reverse geocoding successful');
          return result;
        }
      }
      clearTimeout(nominatimTimeout);
    } catch (error: any) {
      clearTimeout(nominatimTimeout);
      if (error.name === 'AbortError') {
        console.log('Nominatim reverse geocoding timed out');
        await logError('location_timeout', {
          service: 'nominatim',
          coordinates: { lat, lon },
          timeout_duration: '5s'
        });
      } else {
        console.log('Nominatim reverse geocoding failed:', error.message);
      }
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Reverse geocoding error:', error);
    await logError('location_timeout', {
      coordinates: { lat, lon },
      error: error.message,
      all_services_failed: true
    });
  }

  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ 
        error: 'Missing latitude or longitude' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Reverse geocoding request for: ${latitude}, ${longitude}`);

    const locationData = await enhancedReverseGeocode(latitude, longitude);

    if (locationData) {
      return new Response(JSON.stringify({
        success: true,
        data: locationData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Return nearest city as fallback
      const nearest = findNearestIMDCity(latitude, longitude);
      const fallbackData = {
        city: nearest.name,
        state: 'Unknown',
        country: 'India',
        latitude,
        longitude,
        cityId: nearest.id,
        distanceToNearestTown: nearest.distance,
        nearestTown: nearest.name,
        fallback: true
      };

      console.log('Using fallback location data');
      await logError('location_timeout', {
        coordinates: { latitude, longitude },
        fallback_used: true,
        nearest_city: nearest.name,
        distance: nearest.distance
      });

      return new Response(JSON.stringify({
        success: true,
        data: fallbackData,
        warning: 'Used nearest city due to geocoding timeout'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('Geocode function error:', error);
    await logError('location_timeout', {
      error: error.message,
      function: 'geocode'
    });
    
    return new Response(JSON.stringify({ 
      error: 'Failed to process geocoding request',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});