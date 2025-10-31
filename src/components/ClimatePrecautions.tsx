import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Cloud, Droplets, Wind, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  rain?: number;
  windSpeed?: number;
}

interface PrecautionItem {
  icon: JSX.Element;
  text: string;
}

interface Props {
  location: { lat: number; lon: number };
  cityName: string;
}

export const ClimatePrecautions = ({ location, cityName }: Props) => {
  const { t, i18n } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [precautions, setPrecautions] = useState<PrecautionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeatherAndPrecautions();
  }, [location, i18n.language]);

  const fetchWeatherAndPrecautions = async () => {
    try {
      setLoading(true);
      
      // Fetch current weather from OpenWeatherMap
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather`,
        {
          params: {
            lat: location.lat,
            lon: location.lon,
            appid: import.meta.env.VITE_OPENWEATHER_API_KEY || 'demo',
            units: 'metric'
          },
          timeout: 10000
        }
      );

      const weatherData: WeatherData = {
        temp: weatherResponse.data.main.temp,
        condition: weatherResponse.data.weather[0].main,
        description: weatherResponse.data.weather[0].description,
        rain: weatherResponse.data.rain?.['1h'] || 0,
        windSpeed: weatherResponse.data.wind.speed
      };

      setWeather(weatherData);
      
      // Generate precautions based on weather conditions
      const generatedPrecautions = generatePrecautions(weatherData);
      setPrecautions(generatedPrecautions);
      
    } catch (err) {
      console.error('Failed to fetch weather:', err);
      // Fallback precautions
      setPrecautions(getDefaultPrecautions());
    } finally {
      setLoading(false);
    }
  };

  const generatePrecautions = (weather: WeatherData): PrecautionItem[] => {
    const precautionsList: PrecautionItem[] = [];
    
    // Temperature-based
    if (weather.temp > 35) {
      precautionsList.push({
        icon: <Cloud className="w-4 h-4" />,
        text: getTranslatedPrecaution('heatwave')
      });
    } else if (weather.temp < 10) {
      precautionsList.push({
        icon: <Wind className="w-4 h-4" />,
        text: getTranslatedPrecaution('cold')
      });
    }
    
    // Rain-based
    if (weather.rain && weather.rain > 2) {
      precautionsList.push({
        icon: <Droplets className="w-4 h-4" />,
        text: getTranslatedPrecaution('heavy_rain')
      });
    }
    
    // Wind-based
    if (weather.windSpeed && weather.windSpeed > 15) {
      precautionsList.push({
        icon: <Wind className="w-4 h-4" />,
        text: getTranslatedPrecaution('strong_winds')
      });
    }
    
    // Weather condition-based
    if (weather.condition === 'Thunderstorm') {
      precautionsList.push({
        icon: <Shield className="w-4 h-4" />,
        text: getTranslatedPrecaution('thunderstorm')
      });
    }
    
    // Always add general precaution
    if (precautionsList.length === 0) {
      precautionsList.push({
        icon: <Shield className="w-4 h-4" />,
        text: getTranslatedPrecaution('general')
      });
    }
    
    return precautionsList.slice(0, 5); // Max 5 precautions
  };

  const getTranslatedPrecaution = (type: string): string => {
    const precautions: Record<string, Record<string, string>> = {
      heatwave: {
        en: 'High temperature alert. Stay hydrated and avoid direct sunlight.',
        hi: 'उच्च तापमान चेतावनी। हाइड्रेटेड रहें और सीधी धूप से बचें।',
        ta: 'அதிக வெப்பநிலை எச்சரிக்கை. நீர்ச்சத்து பராமரிக்கவும்.',
        te: 'అధిక ఉష్ణోగ్రత హెచ్చరిక. నీరుగారడం మరియు ప్రత్యక్ష సూర్యరశ్మిని తప్పించండి.',
        kn: 'ಹೆಚ್ಚಿನ ತಾಪಮಾನ ಎಚ್ಚರಿಕೆ. ನೀರಿನ ಸೇವನೆ ಮತ್ತು ನೇರ ಸೂರ್ಯನ ಬೆಳಕನ್ನು ತಪ್ಪಿಸಿ.',
        ml: 'ഉയർന്ന താപനില മുന്നറിയിപ്പ്. ജലാംശം നിലനിർത്തുക.'
      },
      heavy_rain: {
        en: 'Heavy rain expected. Avoid low-lying areas and flooding zones.',
        hi: 'भारी बारिश की उम्मीद। निचले क्षेत्रों और बाढ़ वाले क्षेत्रों से बचें।',
        ta: 'கனமழை எதிர்பார்க்கப்படுகிறது. தாழ்வான பகுதிகளைத் தவிர்க்கவும்.',
        te: 'భారీ వర్షం అవకాశం. లోతైన ప్రాంతాలు మరియు వరద మండలాలకు దూరంగా ఉండండి.',
        kn: 'ಭಾರೀ ಮಳೆ ನಿರೀಕ್ಷೆ. ತಗ್ಗು ಪ್ರದೇಶಗಳನ್ನು ತಪ್ಪಿಸಿ.',
        ml: 'കനത്ത മഴ പ്രതീക്ഷിക്കുന്നു. താഴ്ന്ന പ്രദേശങ്ങൾ ഒഴിവാക്കുക.'
      },
      thunderstorm: {
        en: 'Thunderstorm warning. Stay indoors and avoid electrical equipment.',
        hi: 'गरज के साथ तूफान की चेतावनी। घर के अंदर रहें और बिजली के उपकरणों से बचें।',
        ta: 'இடிமின்னல் எச்சரிக்கை. வீட்டிற்குள் இருங்கள்.',
        te: 'ఉరుములు హెచ్చరిక. లోపల ఉండండి మరియు విద్యుత్ పరికరాలను తప్పించండి.',
        kn: 'ಗುಡುಗು ಸಹಿತ ಮಳೆಯ ಎಚ್ಚರಿಕೆ. ಒಳಾಂಗಣದಲ್ಲಿರಿ.',
        ml: 'ഇടിമിന്നൽ മുന്നറിയിപ്പ്. വീടിനുള്ളിൽ തന്നെ നിൽക്കുക.'
      },
      strong_winds: {
        en: 'Strong winds forecasted. Secure loose objects and stay alert.',
        hi: 'तेज़ हवाओं की भविष्यवाणी। ढीली वस्तुओं को सुरक्षित करें और सतर्क रहें।',
        ta: 'வலுவான காற்று எதிர்பார்க்கப்படுகிறது. பாதுகாப்பாக இருங்கள்.',
        te: 'బలమైన గాలులు అంచనా. వదులుగా ఉన్న వస్తువులను భద్రపరచండి.',
        kn: 'ಬಲವಾದ ಗಾಳಿ ಮುನ್ಸೂಚನೆ. ಸುರಕ್ಷಿತವಾಗಿರಿ.',
        ml: 'ശക്തമായ കാറ്റ് പ്രവചനം. സുരക്ഷിതരായിരിക്കുക.'
      },
      cold: {
        en: 'Cold weather alert. Wear warm clothes and protect vulnerable groups.',
        hi: 'ठंड का मौसम चेतावनी। गर्म कपड़े पहनें और कमजोर समूहों की रक्षा करें।',
        ta: 'குளிர் வானிலை எச்சரிக்கை. வெதுவெதுப்பான உடைகள் அணியுங்கள்.',
        te: 'చల్లని వాతావరణ హెచ్చరిక. వెచ్చని బట్టలు ధరించండి.',
        kn: 'ಶೀತ ಹವಾಮಾನ ಎಚ್ಚರಿಕೆ. ಬೆಚ್ಚಗಿನ ಬಟ್ಟೆಗಳನ್ನು ಧರಿಸಿ.',
        ml: 'തണുത്ത കാലാവസ്ഥ മുന്നറിയിപ്പ്. ചൂടുള്ള വസ്ത്രങ്ങൾ ധരിക്കുക.'
      },
      general: {
        en: 'Keep emergency kit ready. Stay informed through official alerts.',
        hi: 'आपातकालीन किट तैयार रखें। आधिकारिक अलर्ट के माध्यम से सूचित रहें।',
        ta: 'அவசர கருவிகளை தயாராக வைக்கவும். அதிகாரப்பூர்வ எச்சரிக்கைகளை கவனிக்கவும்.',
        te: 'అత్యవసర కిట్ సిద్ధంగా ఉంచండి. అధికారిక హెచ్చరికల ద్వారా సమాచారంగా ఉండండి.',
        kn: 'ತುರ್ತು ಕಿಟ್ ಸಿದ್ಧವಾಗಿಟ್ಟುಕೊಳ್ಳಿ. ಅಧಿಕೃತ ಎಚ್ಚರಿಕೆಗಳ ಮೂಲಕ ಮಾಹಿತಿ ಪಡೆಯಿರಿ.',
        ml: 'അടിയന്തര കിറ്റ് സജ്ജമാക്കുക. ഔദ്യോഗിക മുന്നറിയിപ്പുകൾ പിന്തുടരുക.'
      }
    };

    const lang = i18n.language;
    return precautions[type]?.[lang] || precautions[type]?.en || '';
  };

  const getDefaultPrecautions = (): PrecautionItem[] => {
    return [
      {
        icon: <Shield className="w-4 h-4" />,
        text: getTranslatedPrecaution('general')
      }
    ];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {t('precautions.title')}
        </CardTitle>
        {weather && (
          <p className="text-sm text-muted-foreground">
            {cityName} • {weather.temp}°C • {weather.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">{t('precautions.loading')}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {precautions.map((precaution, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="mt-0.5 text-primary">{precaution.icon}</div>
                <p className="text-sm flex-1">{precaution.text}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
