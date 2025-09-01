import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  windSpeed: number;
  windDirection?: number;
  uvIndex?: number;
  precipitation: number;
  tempMin: number;
  tempMax: number;
  city: string;
  latitude: number;
  longitude: number;
  warnings: string[];
  safetyLevel: 'safe' | 'caution' | 'danger';
  forecast?: ForecastData[];
}

export interface ForecastData {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  precipitation: number;
}

export interface LocationData {
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  cityId?: number;
}

export interface DisasterAlert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  location: string;
  description: string;
  timestamp: Date;
}

class EnhancedWeatherService {
  private baseUrls = {
    openMeteo: 'https://api.open-meteo.com/v1',
    nominatim: 'https://nominatim.openstreetmap.org'
  };

  // Major Indian cities with coordinates and IDs
  private cityDatabase = {
    'Delhi': { lat: 28.6139, lon: 77.2090, id: 42182 },
    'Mumbai': { lat: 19.0760, lon: 72.8777, id: 43003 },
    'Bangalore': { lat: 12.9716, lon: 77.5946, id: 43279 },
    'Chennai': { lat: 13.0827, lon: 80.2707, id: 43279 },
    'Kolkata': { lat: 22.5726, lon: 88.3639, id: 42809 },
    'Hyderabad': { lat: 17.3850, lon: 78.4867, id: 43128 },
    'Pune': { lat: 18.5204, lon: 73.8567, id: 43063 },
    'Ahmedabad': { lat: 23.0225, lon: 72.5714, id: 42647 },
    'Jaipur': { lat: 26.9124, lon: 75.7873, id: 42361 },
    'Surat': { lat: 21.1702, lon: 72.8311, id: 42647 }
  };

  // Geocoding with autocomplete using weather edge function
  async searchLocations(query: string): Promise<LocationData[]> {
    if (query.length < 2) return [];

    try {
      // Use Nominatim for geocoding (free and no API key required)
      const nominatimResponse = await axios.get(
        `${this.baseUrls.nominatim}/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=5`
      );

      return nominatimResponse.data.map((item: any) => ({
        city: item.display_name.split(',')[0],
        state: this.extractState(item.display_name),
        country: 'India',
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon)
      }));

    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }

  // Enhanced reverse geocoding with IMD city snapping
  async reverseGeocode(lat: number, lon: number): Promise<LocationData | null> {
    try {
      // Use Nominatim for reverse geocoding
      const nominatimResponse = await axios.get(
        `${this.baseUrls.nominatim}/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
      );

      let location: LocationData | null = null;

      if (nominatimResponse.data) {
        const data = nominatimResponse.data;
        location = {
          city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
          state: data.address?.state,
          country: data.address?.country || 'India',
          latitude: lat,
          longitude: lon
        };
      }

      if (location) {
        // Find nearest IMD-supported city if current location is >50km away
        const nearestCity = this.findNearestIMDCity(lat, lon);
        if (nearestCity.distance > 50) {
          location.cityId = nearestCity.id;
          // Add distance info to location for display purposes  
          (location as any).distanceToNearestTown = nearestCity.distance;
          (location as any).nearestTown = nearestCity.name;
        } else {
          // Check if current city is in IMD database
          const cityKey = Object.keys(this.cityDatabase).find(key => 
            key.toLowerCase() === location!.city.toLowerCase()
          );
          if (cityKey) {
            location.cityId = this.cityDatabase[cityKey as keyof typeof this.cityDatabase].id;
          }
        }
      }

      return location;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  // Haversine distance calculation
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Find nearest IMD-supported city
  private findNearestIMDCity(lat: number, lon: number): { name: string; distance: number; id: number } {
    let nearest = { name: 'Delhi', distance: Infinity, id: 42182 };
    
    Object.entries(this.cityDatabase).forEach(([cityName, cityData]) => {
      const distance = this.calculateDistance(lat, lon, cityData.lat, cityData.lon);
      if (distance < nearest.distance) {
        nearest = { name: cityName, distance, id: cityData.id };
      }
    });

    return nearest;
  }

  // Enhanced weather fetching using secure edge function
  async getCurrentWeather(location: LocationData): Promise<WeatherData> {
    try {
      // Check cache first
      const cached = await this.getCachedWeather(location.latitude, location.longitude);
      if (cached) {
        return cached;
      }

      let weatherData: WeatherData | null = null;

      // Try weather edge function first (secure API key usage)
      try {
        const response = await supabase.functions.invoke('weather', {
          body: {
            latitude: location.latitude,
            longitude: location.longitude,
            city: location.city
          }
        });

        if (response.data && !response.error) {
          weatherData = this.transformEdgeFunctionData(response.data, location);
        }
      } catch (error) {
        console.warn('Weather edge function failed, trying Open-Meteo');
      }

      // Fallback to Open-Meteo (free, no API key required)
      if (!weatherData) {
        try {
          weatherData = await this.getOpenMeteoData(location);
        } catch (error) {
          console.warn('Open-Meteo failed, using fallback');
        }
      }

      // Final fallback
      if (!weatherData) {
        weatherData = this.getFallbackWeather(location);
      }

      // Cache the result
      await this.cacheWeather(weatherData);
      
      return weatherData;

    } catch (error) {
      console.error('Weather fetch error:', error);
      return this.getFallbackWeather(location);
    }
  }

  // Transform weather edge function response to WeatherData
  private transformEdgeFunctionData(data: any, location: LocationData): WeatherData {
    return {
      temperature: Math.round(data.temperature || data.temp || 25),
      feelsLike: Math.round(data.feels_like || data.temperature || 25),
      humidity: data.humidity || 60,
      description: data.description || data.weather_main || 'Clear',
      windSpeed: Math.round(data.wind_speed || 5),
      windDirection: data.wind_direction || 0,
      uvIndex: data.uv_index || 0,
      precipitation: data.precipitation || data.rain || 0,
      tempMin: Math.round(data.temp_min || data.temperature - 3),
      tempMax: Math.round(data.temp_max || data.temperature + 3),
      city: location.city,
      latitude: location.latitude,
      longitude: location.longitude,
      warnings: data.warnings || [],
      safetyLevel: this.determineSafetyLevel(data),
      forecast: data.forecast || []
    };
  }

  private async getOpenMeteoData(location: LocationData): Promise<WeatherData> {
    const response = await axios.get(`${this.baseUrls.openMeteo}/forecast`, {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
        daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum',
        timezone: 'Asia/Kolkata',
        forecast_days: 7
      }
    });

    const current = response.data.current;
    const daily = response.data.daily;

    const forecastData: ForecastData[] = daily.time.slice(0, 7).map((date: string, index: number) => ({
      date,
      tempMax: Math.round(daily.temperature_2m_max[index]),
      tempMin: Math.round(daily.temperature_2m_min[index]),
      condition: this.getWeatherDescription(daily.weather_code[index]),
      precipitation: daily.precipitation_sum[index] || 0
    }));

    return {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: Math.round(current.relative_humidity_2m),
      description: this.getWeatherDescription(current.weather_code),
      windSpeed: Math.round(current.wind_speed_10m * 3.6),
      windDirection: current.wind_direction_10m,
      uvIndex: 0,
      precipitation: current.precipitation || 0,
      tempMin: Math.round(daily.temperature_2m_min[0]),
      tempMax: Math.round(daily.temperature_2m_max[0]),
      city: location.city,
      latitude: location.latitude,
      longitude: location.longitude,
      warnings: this.analyzeOpenMeteoConditions(current, daily),
      safetyLevel: this.calculateOpenMeteoSafetyLevel(current),
      forecast: forecastData
    };
  }

  // Determine safety level from edge function data
  private determineSafetyLevel(data: any): 'safe' | 'caution' | 'danger' {
    const temp = data.temperature || data.temp || 25;
    const wind = data.wind_speed || 0;
    const rain = data.precipitation || data.rain || 0;
    
    if (temp > 42 || wind > 20 || rain > 20) {
      return 'danger';
    }
    
    if (temp > 35 || wind > 10 || rain > 5) {
      return 'caution';
    }
    
    return 'safe';
  }

  // Caching functions
  private async getCachedWeather(lat: number, lon: number): Promise<WeatherData | null> {
    try {
      const { data, error } = await supabase
        .from('weather_cache')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .eq('latitude', parseFloat(lat.toFixed(6)))
        .eq('longitude', parseFloat(lon.toFixed(6)))
        .order('cached_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return null;

      const cached = data[0];
      return {
        temperature: parseFloat(cached.temperature?.toString() || '0'),
        feelsLike: parseFloat(cached.feels_like?.toString() || '0'),
        humidity: cached.humidity || 0,
        description: cached.weather_condition || '',
        windSpeed: parseFloat(cached.wind_speed?.toString() || '0'),
        windDirection: cached.wind_direction || 0,
        uvIndex: parseFloat(cached.uv_index?.toString() || '0'),
        precipitation: parseFloat(cached.precipitation?.toString() || '0'),
        tempMin: parseFloat(cached.temp_min?.toString() || '0'),
        tempMax: parseFloat(cached.temp_max?.toString() || '0'),
        city: cached.city,
        latitude: parseFloat(cached.latitude?.toString() || '0'),
        longitude: parseFloat(cached.longitude?.toString() || '0'),
        warnings: [],
        safetyLevel: 'safe',
        forecast: Array.isArray(cached.forecast_data) ? cached.forecast_data as unknown as ForecastData[] : []
      };
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private async cacheWeather(weather: WeatherData): Promise<void> {
    try {
      await supabase
        .from('weather_cache')
        .insert({
          latitude: parseFloat(weather.latitude.toFixed(6)),
          longitude: parseFloat(weather.longitude.toFixed(6)),
          city: weather.city,
          temperature: weather.temperature,
          feels_like: weather.feelsLike,
          humidity: weather.humidity,
          wind_speed: weather.windSpeed,
          wind_direction: weather.windDirection,
          weather_condition: weather.description,
          uv_index: weather.uvIndex,
          precipitation: weather.precipitation,
          temp_min: weather.tempMin,
          temp_max: weather.tempMax,
          forecast_data: weather.forecast as any
        });
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  // Disaster alerts (simplified - to be enhanced with secure backend integration)
  async getDisasterAlerts(location: LocationData): Promise<DisasterAlert[]> {
    const alerts: DisasterAlert[] = [];
    
    try {
      // For now, return empty array
      // Future enhancement: Integrate with secure government API endpoints via edge functions
      console.log('Disaster alerts check for:', location.city);
      
    } catch (error) {
      console.error('Disaster alerts error:', error);
    }
    
    return alerts;
  }

  // Helper functions
  private extractState(displayName: string): string | undefined {
    const parts = displayName.split(',').map(part => part.trim());
    return parts.length > 2 ? parts[parts.length - 2] : undefined;
  }

  private analyzeWeatherConditions(weather: any): string[] {
    const warnings: string[] = [];
    
    if (weather.main.temp > 40) {
      warnings.push('Extreme heat warning - Stay hydrated and avoid outdoor activities');
    }
    
    if (weather.wind.speed > 15) {
      warnings.push('High wind speeds - Secure loose objects');
    }
    
    if (weather.main.humidity > 90) {
      warnings.push('Very high humidity - Heat index elevated');
    }
    
    if (weather.rain?.['1h'] > 10) {
      warnings.push('Heavy rainfall - Flood risk possible');
    }
    
    return warnings;
  }

  private calculateSafetyLevel(weather: any): 'safe' | 'caution' | 'danger' {
    if (weather.main.temp > 42 || weather.wind.speed > 20 || (weather.rain?.['1h'] || 0) > 20) {
      return 'danger';
    }
    
    if (weather.main.temp > 35 || weather.wind.speed > 10 || (weather.rain?.['1h'] || 0) > 5) {
      return 'caution';
    }
    
    return 'safe';
  }

  private analyzeOpenMeteoConditions(current: any, daily: any): string[] {
    const warnings: string[] = [];
    
    if (current.temperature_2m > 40) {
      warnings.push('Extreme heat warning');
    }
    
    if (current.wind_speed_10m > 15) {
      warnings.push('High wind speeds expected');
    }
    
    if (current.precipitation > 10) {
      warnings.push('Heavy precipitation - Exercise caution');
    }
    
    return warnings;
  }

  private calculateOpenMeteoSafetyLevel(current: any): 'safe' | 'caution' | 'danger' {
    if (current.temperature_2m > 42 || current.wind_speed_10m > 20 || current.precipitation > 20) {
      return 'danger';
    }
    
    if (current.temperature_2m > 35 || current.wind_speed_10m > 10 || current.precipitation > 5) {
      return 'caution';
    }
    
    return 'safe';
  }

  private calculateIMDSafetyLevel(data: any): 'safe' | 'caution' | 'danger' {
    if (data.warnings && data.warnings.length > 0) {
      const hasHighSeverity = data.warnings.some((w: string) => 
        w.toLowerCase().includes('severe') || w.toLowerCase().includes('extreme')
      );
      return hasHighSeverity ? 'danger' : 'caution';
    }
    return 'safe';
  }

  private classifyWarningType(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('flood') || desc.includes('heavy rain')) return 'flood';
    if (desc.includes('cyclone') || desc.includes('storm')) return 'cyclone';
    if (desc.includes('heat') || desc.includes('temperature')) return 'heatwave';
    if (desc.includes('earthquake')) return 'earthquake';
    if (desc.includes('tsunami')) return 'tsunami';
    return 'weather';
  }

  private calculateSeverity(warning: any): 'low' | 'medium' | 'high' {
    const desc = (warning.description || '').toLowerCase();
    if (desc.includes('severe') || desc.includes('extreme') || desc.includes('red')) return 'high';
    if (desc.includes('moderate') || desc.includes('orange') || desc.includes('yellow')) return 'medium';
    return 'low';
  }

  private analyzeFloodRisk(rainfallData: any, city: string): DisasterAlert | null {
    const totalRainfall = rainfallData.rainfall || 0;
    
    if (totalRainfall > 100) {
      return {
        type: 'flood',
        severity: 'high',
        location: city,
        description: `Heavy rainfall detected (${totalRainfall}mm). Flood risk assessment in progress.`,
        timestamp: new Date()
      };
    }
    
    return null;
  }

  private getWeatherDescription(code: number): string {
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

  private getFallbackWeather(location: LocationData): WeatherData {
    return {
      temperature: 28,
      feelsLike: 32,
      humidity: 65,
      description: 'Partly Cloudy',
      windSpeed: 8,
      windDirection: 180,
      uvIndex: 6,
      precipitation: 0,
      tempMin: 24,
      tempMax: 32,
      city: location.city,
      latitude: location.latitude,
      longitude: location.longitude,
      warnings: ['Weather data temporarily unavailable'],
      safetyLevel: 'safe',
      forecast: []
    };
  }
}

export const enhancedWeatherService = new EnhancedWeatherService();