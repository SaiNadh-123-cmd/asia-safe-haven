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
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');

interface DisasterAlert {
  type: 'flood' | 'storm' | 'heatwave' | 'cyclone' | 'earthquake' | 'wildfire' | 'drought';
  severity: 1 | 2 | 3; // 1: mild, 2: moderate, 3: severe
  location: string;
  message: string;
  coordinates: { lat: number; lon: number };
}

// Disaster detection thresholds
const DISASTER_THRESHOLDS = {
  flood: { precipitation: 50, humidity: 85 }, // mm/3h, %
  storm: { windSpeed: 50, precipitation: 25 }, // km/h, mm/3h
  heatwave: { temperature: 40, humidity: 30 }, // °C, % (low humidity with high temp)
  cyclone: { windSpeed: 74, precipitation: 75 }, // km/h, mm/3h
  drought: { precipitation: 2, humidity: 20 }, // mm/week, %
  wildfire: { temperature: 35, humidity: 15, windSpeed: 30 } // °C, %, km/h
};

async function detectDisasters(weatherData: any): Promise<DisasterAlert[]> {
  const alerts: DisasterAlert[] = [];
  const { temperature, humidity, wind_speed, precipitation, city, latitude, longitude } = weatherData;

  // Flood detection
  if (precipitation >= DISASTER_THRESHOLDS.flood.precipitation && humidity >= DISASTER_THRESHOLDS.flood.humidity) {
    const severity = precipitation >= 100 ? 3 : precipitation >= 75 ? 2 : 1;
    alerts.push({
      type: 'flood',
      severity,
      location: city,
      message: `Flood Alert in ${city}! Heavy rainfall detected (${precipitation}mm). Avoid low-lying areas and waterlogged roads.`,
      coordinates: { lat: latitude, lon: longitude }
    });
  }

  // Storm detection
  if (wind_speed >= DISASTER_THRESHOLDS.storm.windSpeed && precipitation >= DISASTER_THRESHOLDS.storm.precipitation) {
    const severity = wind_speed >= 90 ? 3 : wind_speed >= 70 ? 2 : 1;
    alerts.push({
      type: 'storm',
      severity,
      location: city,
      message: `Storm Warning in ${city}! Strong winds (${wind_speed} km/h) and rain expected. Stay indoors and secure loose objects.`,
      coordinates: { lat: latitude, lon: longitude }
    });
  }

  // Heatwave detection
  if (temperature >= DISASTER_THRESHOLDS.heatwave.temperature && humidity <= DISASTER_THRESHOLDS.heatwave.humidity) {
    const severity = temperature >= 45 ? 3 : temperature >= 42 ? 2 : 1;
    alerts.push({
      type: 'heatwave',
      severity,
      location: city,
      message: `Heatwave Alert in ${city}! Extreme temperature (${temperature}°C). Stay hydrated and avoid outdoor activities.`,
      coordinates: { lat: latitude, lon: longitude }
    });
  }

  // Cyclone detection (enhanced storm)
  if (wind_speed >= DISASTER_THRESHOLDS.cyclone.windSpeed && precipitation >= DISASTER_THRESHOLDS.cyclone.precipitation) {
    alerts.push({
      type: 'cyclone',
      severity: 3,
      location: city,
      message: `Cyclone Warning in ${city}! Severe weather conditions. Evacuate to safe areas immediately!`,
      coordinates: { lat: latitude, lon: longitude }
    });
  }

  // Wildfire risk detection
  if (temperature >= DISASTER_THRESHOLDS.wildfire.temperature && 
      humidity <= DISASTER_THRESHOLDS.wildfire.humidity && 
      wind_speed >= DISASTER_THRESHOLDS.wildfire.windSpeed) {
    const severity = temperature >= 40 && humidity <= 10 ? 3 : 2;
    alerts.push({
      type: 'wildfire',
      severity,
      location: city,
      message: `Wildfire Risk in ${city}! High temperature (${temperature}°C), low humidity, and strong winds. Avoid open flames.`,
      coordinates: { lat: latitude, lon: longitude }
    });
  }

  // Drought detection (requires longer-term data, simplified here)
  if (humidity <= DISASTER_THRESHOLDS.drought.humidity && precipitation <= DISASTER_THRESHOLDS.drought.precipitation) {
    alerts.push({
      type: 'drought',
      severity: 2,
      location: city,
      message: `Drought Conditions in ${city}. Very low humidity and minimal rainfall. Conserve water resources.`,
      coordinates: { lat: latitude, lon: longitude }
    });
  }

  return alerts;
}

async function sendFCMNotification(fcmToken: string, alert: DisasterAlert) {
  if (!FCM_SERVER_KEY) {
    console.log('FCM_SERVER_KEY not configured, skipping notification');
    return;
  }

  const notificationCount = alert.severity; // Send multiple notifications for higher severity
  
  for (let i = 0; i < notificationCount; i++) {
    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: fcmToken,
          notification: {
            title: `🚨 ${alert.type.toUpperCase()} ALERT ${alert.severity === 3 ? '- URGENT' : ''}`,
            body: alert.message,
            icon: '/icon-192x192.png',
            badge: '/badge-icon.png',
            sound: alert.severity === 3 ? 'emergency.mp3' : 'default',
            priority: alert.severity === 3 ? 'high' : 'normal',
            click_action: `${Deno.env.get('SUPABASE_URL')}/dashboard`
          },
          data: {
            type: alert.type,
            severity: alert.severity.toString(),
            location: alert.location,
            coordinates: JSON.stringify(alert.coordinates)
          }
        })
      });

      if (response.ok) {
        console.log(`FCM notification sent successfully (${i + 1}/${notificationCount}) for ${alert.type} in ${alert.location}`);
      } else {
        console.error('Failed to send FCM notification:', await response.text());
      }
    } catch (error) {
      console.error('Error sending FCM notification:', error);
    }
    
    // Delay between multiple notifications for severe alerts
    if (i < notificationCount - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    }
  }
}

async function checkUserLocationsForDisasters() {
  console.log('Checking user locations for disasters...');
  
  try {
    // Get all user profiles with locations
    const { data: userProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, latitude, longitude, city, fcm_token')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('fcm_token', 'is', null);

    if (profileError) {
      console.error('Error fetching user profiles:', profileError);
      return;
    }

    if (!userProfiles || userProfiles.length === 0) {
      console.log('No user profiles with location data found');
      return;
    }

    console.log(`Checking weather for ${userProfiles.length} user locations`);

    // Check each user's location for disasters
    for (const profile of userProfiles) {
      try {
        // Fetch weather data for user's location
        const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${profile.latitude}&lon=${profile.longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`);
        
        if (!weatherResponse.ok) {
          console.error(`Failed to fetch weather for user ${profile.user_id}`);
          continue;
        }

        const weatherData = await weatherResponse.json();
        
        // Transform to our format
        const processedWeather = {
          temperature: Math.round(weatherData.main.temp),
          humidity: weatherData.main.humidity,
          wind_speed: Math.round(weatherData.wind.speed * 3.6), // Convert m/s to km/h
          precipitation: weatherData.rain?.['1h'] || weatherData.snow?.['1h'] || 0,
          city: profile.city,
          latitude: profile.latitude,
          longitude: profile.longitude
        };

        // Detect disasters
        const alerts = await detectDisasters(processedWeather);
        
        // Send notifications for detected disasters
        if (alerts.length > 0) {
          console.log(`Found ${alerts.length} disasters for user ${profile.user_id} in ${profile.city}`);
          
          for (const alert of alerts) {
            await sendFCMNotification(profile.fcm_token, alert);
            
            // Log the alert
            console.log(`Disaster detected: ${alert.type} (severity ${alert.severity}) in ${alert.location}`);
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing user ${profile.user_id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error in disaster check process:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'check';

    if (action === 'check') {
      // Manual disaster check (can be called via cron or manually)
      await checkUserLocationsForDisasters();
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Disaster check completed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else if (action === 'register') {
      // Register FCM token for a user
      const { fcm_token } = await req.json();
      
      // Get the authenticated user
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authorization required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update user profile with FCM token
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          fcm_token: fcm_token
        });

      if (updateError) {
        console.error('Error updating FCM token:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to register token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'FCM token registered successfully' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Notifications function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});