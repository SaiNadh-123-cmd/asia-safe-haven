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

const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY') || 'c539305eb1479c8064edb1b01ced63d9';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, city } = await req.json();

    console.log(`Fetching weather for: ${city} (${latitude}, ${longitude})`);

    // Check cache first
    const { data: cachedData } = await supabase
      .from('weather_cache')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .eq('latitude', latitude.toFixed(6))
      .eq('longitude', longitude.toFixed(6))
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

    // Try OpenWeatherMap first
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
          latitude,
          longitude,
          city,
          forecast_data: forecastData,
          source: 'openweathermap'
        };

        console.log('OpenWeatherMap data retrieved successfully');
      }
    } catch (error) {
      console.log('OpenWeatherMap failed:', error.message);
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
            latitude,
            longitude,
            city,
            forecast_data: forecastData,
            source: 'open-meteo'
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
        latitude,
        longitude,
        city,
        forecast_data: [],
        source: 'fallback'
      };
    }

    // Cache the result
    try {
      await supabase
        .from('weather_cache')
        .insert({
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          city,
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