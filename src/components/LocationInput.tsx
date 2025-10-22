import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import { fetchNominatimSuggestions } from '@/services/safetyMapService';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface LocationInputProps {
  onLocationSelect: (location: {
    name: string;
    lat: number;
    lon: number;
    city: string;
    state: string;
  }) => void;
  label?: string;
  placeholder?: string;
  initialValue?: string;
}

export const LocationInput = ({
  onLocationSelect,
  label,
  placeholder,
  initialValue = ''
}: LocationInputProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Use translations or fallback to defaults
  const labelText = label || t('location.search');
  const placeholderText = placeholder || t('location.placeholder');

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const results = await fetchNominatimSuggestions(query);
        setSuggestions(results);
        setShowSuggestions(true);
        
        if (results.length === 0) {
          setError(t('location.retry'));
        }
      } catch (error: any) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
        setError(error.message || t('location.retry'));
        toast.error(error.message || t('location.retry'));
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(debounce);
  }, [query, t]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: any) => {
    const city = suggestion.address.city || suggestion.address.town || suggestion.address.village || '';
    const state = suggestion.address.state || '';
    
    setQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    onLocationSelect({
      name: suggestion.display_name,
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon),
      city,
      state
    });
  };

  return (
    <div className="relative w-full">
      <Label htmlFor="location-input" className="text-base font-medium mb-2">
        {labelText}
      </Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          id="location-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholderText}
          className="pl-10 pr-10"
          aria-label="Location search input"
          aria-autocomplete="list"
          aria-controls="location-suggestions"
          aria-expanded={showSuggestions}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {error && suggestions.length === 0 && !isLoading && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2"
            id="location-suggestions"
            role="listbox"
          >
            <Card className="shadow-lg border-2">
              <div className="max-h-80 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={suggestion.place_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3 ${
                      index === selectedIndex ? 'bg-accent' : ''
                    } ${index > 0 ? 'border-t' : ''}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                  >
                    <MapPin className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {suggestion.address.city || suggestion.address.town || suggestion.address.village}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.display_name}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
