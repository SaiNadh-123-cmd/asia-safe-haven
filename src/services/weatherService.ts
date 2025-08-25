import axios from 'axios';

export interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
  windSpeed: number;
  city: string;
  warnings: string[];
  safetyLevel: 'safe' | 'caution' | 'danger';
}

export interface DisasterAlert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  location: string;
  description: string;
  timestamp: Date;
}

class WeatherService {
  private baseUrls = {
    imd: 'https://city.imd.gov.in/api',
    imdMausam: 'https://mausam.imd.gov.in/api',
    openMeteo: 'https://api.open-meteo.com/v1'
  };

  // City ID mapping for major Indian cities
  private cityIds: { [key: string]: number } = {
    'Delhi': 42182,
    'Mumbai': 43003,
    'Bangalore': 43279,
    'Chennai': 43279,
    'Kolkata': 42809,
    'Hyderabad': 43128,
    'Pune': 43063,
    'Ahmedabad': 42647,
    'Surat': 42647,
    'Jaipur': 42361
  };

  async getCurrentWeather(city: string): Promise<WeatherData> {
    try {
      const cityId = this.cityIds[city] || 42182; // Default to Delhi
      
      // Try IMD API first
      const imdResponse = await this.fetchWithTimeout(
        `${this.baseUrls.imd}/cityweather.php?id=${cityId}`,
        5000
      );
      
      if (imdResponse.data) {
        return this.parseIMDWeather(imdResponse.data, city);
      }
      
      // Fallback to Open-Meteo for global coverage
      return await this.getOpenMeteoWeather(city);
    } catch (error) {
      console.error('Weather API error:', error);
      return this.getFallbackWeather(city);
    }
  }

  async getDisasterAlerts(city: string): Promise<DisasterAlert[]> {
    const alerts: DisasterAlert[] = [];
    
    try {
      const cityId = this.cityIds[city] || 42182;
      
      // Check district warnings
      const warningsResponse = await this.fetchWithTimeout(
        `${this.baseUrls.imdMausam}/warnings_district_api.php?id=${Math.floor(cityId / 1000)}`,
        5000
      );
      
      if (warningsResponse.data && warningsResponse.data.warnings) {
        warningsResponse.data.warnings.forEach((warning: any) => {
          alerts.push({
            type: this.classifyWarningType(warning.description || warning.title),
            severity: this.calculateSeverity(warning),
            location: city,
            description: warning.description || warning.title,
            timestamp: new Date()
          });
        });
      }

      // Check rainfall data for flood risk
      const rainfallResponse = await this.fetchWithTimeout(
        `${this.baseUrls.imdMausam}/districtwise_rainfall_api.php`,
        5000
      );
      
      if (rainfallResponse.data) {
        const floodRisk = this.analyzeFloodRisk(rainfallResponse.data);
        if (floodRisk) {
          alerts.push(floodRisk);
        }
      }

    } catch (error) {
      console.error('Disaster alerts API error:', error);
    }
    
    return alerts;
  }

  private async fetchWithTimeout(url: string, timeout: number) {
    return axios.get(url, {
      timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DisasterAlert/1.0'
      }
    });
  }

  private async getOpenMeteoWeather(city: string): Promise<WeatherData> {
    // Simple lat/long for major cities (in production, use geocoding)
    const coordinates: { [key: string]: [number, number] } = {
      'Delhi': [28.6139, 77.2090],
      'Mumbai': [19.0760, 72.8777],
      'Bangalore': [12.9716, 77.5946],
      'Chennai': [13.0827, 80.2707]
    };
    
    const [lat, lon] = coordinates[city] || coordinates['Delhi'];
    
    const response = await axios.get(
      `${this.baseUrls.openMeteo}/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`
    );
    
    const current = response.data.current_weather;
    const hourly = response.data.hourly;
    
    return {
      temperature: Math.round(current.temperature),
      humidity: hourly.relative_humidity_2m[0] || 50,
      description: this.getWeatherDescription(current.weathercode),
      windSpeed: Math.round(current.windspeed),
      city,
      warnings: this.analyzeWeatherWarnings(current, hourly),
      safetyLevel: this.calculateSafetyLevel(current, hourly)
    };
  }

  private parseIMDWeather(data: any, city: string): WeatherData {
    const weather = data.weather || data;
    
    return {
      temperature: Math.round(weather.temp || weather.temperature || 25),
      humidity: weather.humidity || 60,
      description: weather.description || weather.condition || 'Clear',
      windSpeed: Math.round(weather.wind_speed || weather.windSpeed || 5),
      city,
      warnings: weather.warnings || [],
      safetyLevel: this.calculateSafetyLevelFromIMD(weather)
    };
  }

  private getFallbackWeather(city: string): WeatherData {
    return {
      temperature: 28,
      humidity: 65,
      description: 'Partly Cloudy',
      windSpeed: 8,
      city,
      warnings: ['Weather data temporarily unavailable'],
      safetyLevel: 'safe'
    };
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

  private analyzeFloodRisk(rainfallData: any): DisasterAlert | null {
    // Simple flood risk analysis based on rainfall
    const totalRainfall = rainfallData.rainfall || 0;
    
    if (totalRainfall > 100) {
      return {
        type: 'flood',
        severity: 'high',
        location: 'Region',
        description: `Heavy rainfall detected (${totalRainfall}mm). Flood risk assessment in progress.`,
        timestamp: new Date()
      };
    }
    
    return null;
  }

  private analyzeWeatherWarnings(current: any, hourly: any): string[] {
    const warnings: string[] = [];
    
    if (current.temperature > 40) {
      warnings.push('Extreme heat warning - Stay indoors');
    }
    
    if (current.windspeed > 50) {
      warnings.push('High wind warning - Secure loose objects');
    }
    
    // Check for temperature anomalies in hourly data
    const temps = hourly.temperature_2m.slice(0, 24);
    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);
    
    if (maxTemp - minTemp > 20) {
      warnings.push('Extreme temperature fluctuation expected');
    }
    
    return warnings;
  }

  private calculateSafetyLevel(current: any, hourly: any): 'safe' | 'caution' | 'danger' {
    if (current.temperature > 42 || current.windspeed > 60) {
      return 'danger';
    }
    
    if (current.temperature > 35 || current.windspeed > 40) {
      return 'caution';
    }
    
    return 'safe';
  }

  private calculateSafetyLevelFromIMD(weather: any): 'safe' | 'caution' | 'danger' {
    if (weather.warnings && weather.warnings.length > 0) {
      const hasHighSeverity = weather.warnings.some((w: string) => 
        w.toLowerCase().includes('severe') || w.toLowerCase().includes('extreme')
      );
      
      if (hasHighSeverity) return 'danger';
      return 'caution';
    }
    
    return 'safe';
  }

  private getWeatherDescription(code: number): string {
    const codes: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm'
    };
    
    return codes[code] || 'Unknown';
  }
}

export const weatherService = new WeatherService();