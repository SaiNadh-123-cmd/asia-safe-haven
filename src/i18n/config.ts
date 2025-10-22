import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Location Input
      'location.search': 'Search for your city or village',
      'location.placeholder': 'Type city name, village, or area...',
      'location.retry': 'Unable to find location. Try a nearby city?',
      
      // Safety Maps
      'safetyMaps.title': 'Download Safety Maps',
      'safetyMaps.description': 'Get offline access to disaster shelters and evacuation routes in your area',
      'safetyMaps.selectDisaster': 'Select disaster type for your area',
      'safetyMaps.download': 'Download Safety Map for',
      'safetyMaps.downloading': 'Downloading...',
      'safetyMaps.success': 'Safety map downloaded successfully!',
      'safetyMaps.noData': 'No specific safety features found',
      'safetyMaps.error': 'Failed to download safety map. Please try again.',
      'safetyMaps.yourMaps': 'Your Downloaded Maps',
      'safetyMaps.noMapsYet': 'No Safety Maps Yet',
      'safetyMaps.firstMap': 'Download your first safety map',
      
      // Disasters
      'disaster.flood': 'Flood',
      'disaster.earthquake': 'Earthquake',
      'disaster.cyclone': 'Cyclone',
      'disaster.flood.description': 'High-ground shelters and safe evacuation routes',
      'disaster.earthquake.description': 'Open areas and earthquake-safe buildings',
      'disaster.cyclone.description': 'Reinforced shelters and storm-safe routes',
      
      // Map Features
      'map.shelters': 'Shelters',
      'map.routes': 'Routes',
      'map.radius': 'Radius',
      'map.size': 'Size',
      'map.downloaded': 'Downloaded',
      'map.view': 'View',
      'map.delete': 'Delete',
      
      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.retry': 'Retry',
      'common.close': 'Close',
      'common.back': 'Back to Dashboard',
      'common.online': 'Online',
      'common.offline': 'Offline',
    }
  },
  hi: {
    translation: {
      // Location Input
      'location.search': 'अपना शहर या गाँव खोजें',
      'location.placeholder': 'शहर, गाँव या क्षेत्र का नाम लिखें...',
      'location.retry': 'स्थान नहीं मिला। पास का शहर आज़माएं?',
      
      // Safety Maps
      'safetyMaps.title': 'सुरक्षा मानचित्र डाउनलोड करें',
      'safetyMaps.description': 'अपने क्षेत्र में आपदा आश्रय और निकासी मार्गों तक ऑफ़लाइन पहुंच प्राप्त करें',
      'safetyMaps.selectDisaster': 'अपने क्षेत्र के लिए आपदा प्रकार चुनें',
      'safetyMaps.download': 'के लिए सुरक्षा मानचित्र डाउनलोड करें',
      'safetyMaps.downloading': 'डाउनलोड हो रहा है...',
      'safetyMaps.success': 'सुरक्षा मानचित्र सफलतापूर्वक डाउनलोड हुआ!',
      'safetyMaps.noData': 'कोई विशिष्ट सुरक्षा सुविधाएं नहीं मिलीं',
      'safetyMaps.error': 'सुरक्षा मानचित्र डाउनलोड करने में विफल। कृपया पुनः प्रयास करें।',
      'safetyMaps.yourMaps': 'आपके डाउनलोड किए गए मानचित्र',
      'safetyMaps.noMapsYet': 'अभी तक कोई सुरक्षा मानचित्र नहीं',
      'safetyMaps.firstMap': 'अपना पहला सुरक्षा मानचित्र डाउनलोड करें',
      
      // Disasters
      'disaster.flood': 'बाढ़',
      'disaster.earthquake': 'भूकंप',
      'disaster.cyclone': 'चक्रवात',
      'disaster.flood.description': 'ऊंची जमीन के आश्रय और सुरक्षित निकासी मार्ग',
      'disaster.earthquake.description': 'खुले क्षेत्र और भूकंप-सुरक्षित इमारतें',
      'disaster.cyclone.description': 'मजबूत आश्रय और तूफान-सुरक्षित मार्ग',
      
      // Map Features
      'map.shelters': 'आश्रय',
      'map.routes': 'मार्ग',
      'map.radius': 'त्रिज्या',
      'map.size': 'आकार',
      'map.downloaded': 'डाउनलोड किया',
      'map.view': 'देखें',
      'map.delete': 'हटाएं',
      
      // Common
      'common.loading': 'लोड हो रहा है...',
      'common.error': 'त्रुटि',
      'common.retry': 'पुनः प्रयास करें',
      'common.close': 'बंद करें',
      'common.back': 'डैशबोर्ड पर वापस जाएं',
      'common.online': 'ऑनलाइन',
      'common.offline': 'ऑफ़लाइन',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
