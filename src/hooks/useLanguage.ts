import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('disasterAlert_language');
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('disasterAlert_language', languageCode);
  };

  return {
    currentLanguage: i18n.language,
    changeLanguage,
    t: i18n.t
  };
};
