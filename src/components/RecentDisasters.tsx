import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

interface DisasterEvent {
  id: string;
  name: string;
  country: string;
  date: string;
  type: string;
  severity?: string;
}

export const RecentDisasters = () => {
  const { t } = useTranslation();
  const [disasters, setDisasters] = useState<DisasterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentDisasters();
    // Auto-refresh every 30 minutes
    const interval = setInterval(fetchRecentDisasters, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecentDisasters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ReliefWeb API - Recent disasters in India
      const response = await axios.get(
        'https://api.reliefweb.int/v1/disasters',
        {
          params: {
            appname: 'disasteralert',
            'filter[field]': 'country',
            'filter[value]': 'India',
            'filter[operator]': 'AND',
            sort: 'date:desc',
            limit: 10
          },
          timeout: 10000
        }
      );

      const events = response.data?.data?.map((item: any) => ({
        id: item.id,
        name: item.fields?.name || 'Unknown',
        country: item.fields?.country?.[0]?.name || 'India',
        date: item.fields?.date?.created || new Date().toISOString(),
        type: item.fields?.type?.[0]?.name || 'Disaster',
        severity: item.fields?.status?.[0]?.name
      })) || [];

      setDisasters(events);
    } catch (err) {
      console.error('Failed to fetch disasters:', err);
      setError('Unable to load recent disasters');
      
      // Fallback mock data for demo
      setDisasters([
        {
          id: '1',
          name: 'Cyclone Montha',
          country: 'Andhra Pradesh',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'Cyclone',
          severity: 'High'
        },
        {
          id: '2',
          name: 'Heavy Floods',
          country: 'Kerala',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'Flood',
          severity: 'Medium'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getDisasterIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type.toLowerCase()) {
      case 'cyclone':
        return <AlertTriangle className={`${iconClass} text-red-500`} />;
      case 'flood':
        return <AlertTriangle className={`${iconClass} text-blue-500`} />;
      case 'earthquake':
        return <AlertTriangle className={`${iconClass} text-orange-500`} />;
      default:
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {t('dashboard.recent')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">{t('dashboard.loading')}</span>
          </div>
        ) : disasters.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {t('dashboard.noDisasters')}
          </p>
        ) : (
          <div className="space-y-3">
            {disasters.map((disaster) => (
              <div
                key={disaster.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getDisasterIcon(disaster.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">
                      {disaster.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {disaster.country}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(disaster.date)}
                      {disaster.severity && (
                        <span className="ml-2 font-medium">
                          • {disaster.severity}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
