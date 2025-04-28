import { useEffect, useState } from 'react';

// Import all locale files
import en from './locales/en.json';
import ar from './locales/ar.json';

// Define available locales
export const locales = {
  en: 'English',
  ar: 'العربية',
};

// Define locale data
const localeData = {
  en,
  ar,
};

// Get browser language
export const getBrowserLanguage = (): string => {
  if (typeof window === 'undefined') return 'en'; // Default to English on server
  
  const browserLang = navigator.language.split('-')[0];
  return Object.keys(locales).includes(browserLang) ? browserLang : 'en';
};

// Get stored language or browser language
export const getInitialLanguage = (): string => {
  if (typeof window === 'undefined') return 'en'; // Default to English on server
  
  const storedLang = localStorage.getItem('language');
  return storedLang || getBrowserLanguage();
};

// Set language direction (RTL or LTR)
export const setLanguageDirection = (lang: string): void => {
  if (typeof document === 'undefined') return;
  
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
};

// Custom hook for translations
export const useTranslation = () => {
  const [language, setLanguage] = useState<string>(getInitialLanguage());
  
  useEffect(() => {
    // Set language direction
    setLanguageDirection(language);
    
    // Store language preference
    localStorage.setItem('language', language);
  }, [language]);
  
  // Translation function
  const t = (key: string, variables?: Record<string, string>): string => {
    // Split the key by dots to access nested properties
    const keys = key.split('.');
    
    // Get the translation from the locale data
    let translation: any = localeData[language as keyof typeof localeData];
    
    // Access nested properties
    for (const k of keys) {
      if (!translation) return key;
      translation = translation[k];
    }
    
    // If translation is not found, return the key
    if (!translation) return key;
    
    // Replace variables in the translation
    if (variables) {
      return Object.entries(variables).reduce((acc, [key, value]) => {
        return acc.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }, translation);
    }
    
    return translation;
  };
  
  // Change language function
  const changeLanguage = (lang: string): void => {
    if (Object.keys(locales).includes(lang)) {
      setLanguage(lang);
    }
  };
  
  return { t, language, changeLanguage };
};