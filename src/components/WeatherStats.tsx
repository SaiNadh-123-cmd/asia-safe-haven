import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WeatherData } from '@/services/enhancedWeatherService';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye, 
  Sun, 
  CloudRain,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';

interface WeatherStatsProps {
  weatherData: WeatherData;
  className?: string;
}

export const WeatherStats = ({ weatherData, className = '' }: WeatherStatsProps) => {
  const getWeatherIcon = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return <CloudRain className="h-8 w-8 text-primary" />;
    }
    if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) {
      return <Sun className="h-8 w-8 text-yellow-500" />;
    }
    if (lowerCondition.includes('cloud')) {
      return <Droplets className="h-8 w-8 text-gray-500" />;
    }
    
    return <Sun className="h-8 w-8 text-primary" />;
  };

  const getSafetyColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-safe text-safe-foreground';
      case 'caution': return 'bg-caution text-caution-foreground';
      case 'danger': return 'bg-danger text-danger-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getWindDirection = (degrees?: number) => {
    if (!degrees) return 'N/A';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="p-6">
          {/* Main Weather Display */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="p-3 rounded-full bg-primary/10"
              >
                {getWeatherIcon(weatherData.description)}
              </motion.div>
              
              <div>
                <div className="text-3xl font-bold">
                  {weatherData.temperature}°C
                </div>
                <div className="text-sm text-muted-foreground capitalize">
                  {weatherData.description}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Feels like {weatherData.feelsLike}°C
                </div>
              </div>
            </div>

            <div className="text-right">
              <Badge className={getSafetyColor(weatherData.safetyLevel)}>
                {weatherData.safetyLevel.toUpperCase()}
              </Badge>
              <div className="text-sm text-muted-foreground mt-2">
                {weatherData.city}
              </div>
            </div>
          </div>

          {/* Weather Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-background/50"
            >
              <Thermometer className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-sm font-medium">{weatherData.tempMax}°C</div>
                <div className="text-xs text-muted-foreground">High</div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-background/50"
            >
              <Thermometer className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-sm font-medium">{weatherData.tempMin}°C</div>
                <div className="text-xs text-muted-foreground">Low</div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-background/50"
            >
              <Droplets className="h-5 w-5 text-blue-400" />
              <div>
                <div className="text-sm font-medium">{weatherData.humidity}%</div>
                <div className="text-xs text-muted-foreground">Humidity</div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-background/50"
            >
              <Wind className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm font-medium">
                  {weatherData.windSpeed} km/h
                </div>
                <div className="text-xs text-muted-foreground">
                  {getWindDirection(weatherData.windDirection)}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {weatherData.uvIndex !== undefined && weatherData.uvIndex > 0 && (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-background/30"
              >
                <Sun className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-sm font-medium">UV {weatherData.uvIndex}</div>
                  <div className="text-xs text-muted-foreground">Index</div>
                </div>
              </motion.div>
            )}

            {weatherData.precipitation > 0 && (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-background/30"
              >
                <CloudRain className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">{weatherData.precipitation}mm</div>
                  <div className="text-xs text-muted-foreground">Rain</div>
                </div>
              </motion.div>
            )}

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 p-2 rounded-lg bg-background/30"
            >
              <Eye className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium">Good</div>
                <div className="text-xs text-muted-foreground">Visibility</div>
              </div>
            </motion.div>
          </div>

          {/* 7-Day Forecast Preview */}
          {weatherData.forecast && weatherData.forecast.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border/50">
              <h3 className="text-sm font-medium mb-3">7-Day Forecast</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weatherData.forecast.slice(0, 7).map((day, index) => (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col items-center p-2 rounded-lg bg-background/30 min-w-[80px]"
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="h-3 w-3 text-red-400" />
                      <span className="text-xs font-medium">{day.tempMax}°</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-blue-400" />
                      <span className="text-xs">{day.tempMin}°</span>
                    </div>
                    {day.precipitation > 0 && (
                      <div className="text-xs text-blue-500 mt-1">
                        {day.precipitation}mm
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Weather Warnings */}
          {weatherData.warnings && weatherData.warnings.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-3 rounded-lg bg-caution/10 border border-caution/20"
            >
              <h3 className="text-sm font-medium text-caution mb-2">Weather Alerts</h3>
              <div className="space-y-1">
                {weatherData.warnings.map((warning, index) => (
                  <div key={index} className="text-xs text-caution">
                    • {warning}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};