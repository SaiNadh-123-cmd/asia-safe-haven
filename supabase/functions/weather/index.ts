import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');

// Major Indian cities with coordinates and IDs for IMD compatibility
const cityDatabase = {
  'Delhi': { lat: 28.6139, lon: 77.2090, id: 42182 },
  'Mumbai': { lat: 19.0760, lon: 72.8777, id: 43003 },
  'Bangalore': { lat: 12.9716, lon: 77.5946, id: 43296 },
  'Chennai': { lat: 13.0827, lon: 80.2707, id: 43279 },
  'Kolkata': { lat: 22.5726, lon: 88.3639, id: 42809 },
  'Hyderabad': { lat: 17.3850, lon: 78.4867, id: 43128 },
  'Pune': { lat: 18.5204, lon: 73.8567, id: 43063 },
  'Ahmedabad': { lat: 23.0225, lon: 72.5714, id: 42647 },
  'Jaipur': { lat: 26.9124, lon: 75.7873, id: 42361 },
  'Surat': { lat: 21.1702, lon: 72.8311, id: 42647 },
  'Varanasi': { lat: 25.3176, lon: 82.9739, id: 42492 },
  'Agra': { lat: 27.1767, lon: 78.0081, id: 42379 },
  'Kanpur': { lat: 26.4499, lon: 80.3319, id: 42367 },
  'Lucknow': { lat: 26.8467, lon: 80.9462, id: 42369 }
};

// Haversine distance calculation
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

// Enhanced reverse geocoding
async function enhancedReverseGeocode(lat: number, lon: number): Promise<any> {
  try {
    // Try OpenWeatherMap reverse geocoding first (only if API key is available)
    if (OPENWEATHER_API_KEY) {
      const owmResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`
      );

      if (owmResponse.ok) {
        const owmData = await owmResponse.json();
        if (owmData && owmData.length > 0) {
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

          return result;
        }
      }
    }

    // Fallback to Nominatim
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
    );

    if (nominatimResponse.ok) {
      const nominatimData = await nominatimResponse.json();
      if (nominatimData) {
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

        return result;
      }
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
  }

  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, city } = await req.json();

    console.log(`Fetching weather for: ${city} (${latitude}, ${longitude})`);

    // Enhance location data with reverse geocoding if city is not accurate
    let locationData = { city, latitude, longitude };
    if (!city || city === 'Unknown') {
      const enhanced = await enhancedReverseGeocode(latitude, longitude);
      if (enhanced) {
        locationData = enhanced;
      }
    }

    console.log(`Enhanced location: ${locationData.city} (${locationData.latitude}, ${locationData.longitude})`);

    // Check cache first using enhanced location
    const { data: cachedData } = await supabase
      .from('weather_cache')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .eq('latitude', parseFloat(latitude.toFixed(6)))
      .eq('longitude', parseFloat(longitude.toFixed(6)))
      .order('cached_at', { ascending: false })
      .limit(1);

    if (cachedData && cachedData.length > 0) {
      console.log('Returning cached weather data');
      return new Response(JSON.stringify({
        source: 'cache',
        data: cachedData[0]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let weatherData = null;

    // Try OpenWeatherMap first (only if API key is available)
    if (OPENWEATHER_API_KEY) {
      try {
        console.log('Trying OpenWeatherMap API');
        
        const [currentResponse, forecastResponse] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`),
          fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`)
        ]);

        if (currentResponse.ok && forecastResponse.ok) {
          const current = await currentResponse.json();
          const forecast = await forecastResponse.json();

          // Process 7-day forecast
          const forecastData = [];
          const dailyForecast = new Map();

          forecast.list.forEach((item: any) => {
            const date = new Date(item.dt * 1000).toDateString();
            if (!dailyForecast.has(date)) {
              dailyForecast.set(date, {
                date,
                tempMax: item.main.temp_max,
                tempMin: item.main.temp_min,
                condition: item.weather[0].description,
                precipitation: item.rain?.['3h'] || 0
              });
            }
          });

          forecastData.push(...Array.from(dailyForecast.values()).slice(0, 7));

          weatherData = {
            temperature: Math.round(current.main.temp),
            feels_like: Math.round(current.main.feels_like),
            humidity: current.main.humidity,
            weather_condition: current.weather[0].description,
            wind_speed: Math.round(current.wind.speed * 3.6), // Convert m/s to km/h
            wind_direction: current.wind.deg,
            uv_index: 0, // Not available in free tier
            precipitation: current.rain?.['1h'] || current.snow?.['1h'] || 0,
            temp_min: Math.round(current.main.temp_min),
            temp_max: Math.round(current.main.temp_max),
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            city: locationData.city,
            forecast_data: forecastData,
            source: 'openweathermap',
            // Add distance info if showing nearest town
            ...(locationData.distanceToNearestTown && {
              distanceToNearestTown: locationData.distanceToNearestTown,
              nearestTown: locationData.nearestTown
            })
          };

          console.log('OpenWeatherMap data retrieved successfully');
        }
      } catch (error) {
        console.log('OpenWeatherMap failed:', error.message);
      }
    } else {
      console.log('OpenWeatherMap API key not available, skipping to Open-Meteo');
    }

    // Fallback to Open-Meteo
    if (!weatherData) {
      try {
        console.log('Trying Open-Meteo API');
        
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=Asia/Kolkata&forecast_days=7`);
        
        if (response.ok) {
          const data = await response.json();
          const current = data.current;
          const daily = data.daily;

          const forecastData = daily.time.slice(0, 7).map((date: string, index: number) => ({
            date,
            tempMax: Math.round(daily.temperature_2m_max[index]),
            tempMin: Math.round(daily.temperature_2m_min[index]),
            condition: getWeatherDescription(daily.weather_code[index]),
            precipitation: daily.precipitation_sum[index] || 0
          }));

          weatherData = {
            temperature: Math.round(current.temperature_2m),
            feels_like: Math.round(current.apparent_temperature),
            humidity: Math.round(current.relative_humidity_2m),
            weather_condition: getWeatherDescription(current.weather_code),
            wind_speed: Math.round(current.wind_speed_10m * 3.6),
            wind_direction: current.wind_direction_10m,
            uv_index: 0,
            precipitation: current.precipitation || 0,
            temp_min: Math.round(daily.temperature_2m_min[0]),
            temp_max: Math.round(daily.temperature_2m_max[0]),
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            city: locationData.city,
            forecast_data: forecastData,
            source: 'open-meteo',
            // Add distance info if showing nearest town
            ...(locationData.distanceToNearestTown && {
              distanceToNearestTown: locationData.distanceToNearestTown,
              nearestTown: locationData.nearestTown
            })
          };

          console.log('Open-Meteo data retrieved successfully');
        }
      } catch (error) {
        console.log('Open-Meteo failed:', error.message);
      }
    }

    // Final fallback
    if (!weatherData) {
      console.log('Using fallback weather data');
      weatherData = {
        temperature: 28,
        feels_like: 32,
        humidity: 65,
        weather_condition: 'Partly Cloudy',
        wind_speed: 8,
        wind_direction: 180,
        uv_index: 6,
        precipitation: 0,
        temp_min: 24,
        temp_max: 32,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        city: locationData.city,
        forecast_data: [],
        source: 'fallback',
        // Add distance info if showing nearest town
        ...(locationData.distanceToNearestTown && {
          distanceToNearestTown: locationData.distanceToNearestTown,
          nearestTown: locationData.nearestTown
        })
      };
    }

    // Cache the result using enhanced location data
    try {
      await supabase
        .from('weather_cache')
        .insert({
          latitude: parseFloat(locationData.latitude.toFixed(6)),
          longitude: parseFloat(locationData.longitude.toFixed(6)),
          city: locationData.city,
          ...weatherData
        });
      console.log('Weather data cached successfully');
    } catch (cacheError) {
      console.error('Failed to cache weather data:', cacheError);
    }

    return new Response(JSON.stringify({
      source: weatherData.source,
      data: weatherData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Weather function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch weather data',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getWeatherDescription(code: number): string {
  const codes: { [key: number]: string } = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm'
  };
  
  return codes[code] || 'Unknown';
}