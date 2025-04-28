'use client';

import { useState, useEffect } from 'react';
import { useTranslation, locales } from '@/i18n';
import { settingsAPI } from '@/utils/api';

interface LanguageSelectorProps {
  mode?: 'ui' | 'speech';
  onLanguageChange?: (language: string) => void;
  onDialectChange?: (dialect: string) => void;
  initialLanguage?: string;
  initialDialect?: string;
  showDialects?: boolean;
  className?: string;
  dropdownPosition?: 'left' | 'right';
}

interface Language {
  code: string;
  name: string;
  dialects?: { code: string; name: string }[];
}

export default function LanguageSelector({
  mode = 'ui',
  onLanguageChange,
  onDialectChange,
  initialLanguage,
  initialDialect,
  showDialects = false,
  className = '',
  dropdownPosition = 'right'
}: LanguageSelectorProps) {
  const { language, changeLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage || language);
  const [selectedDialect, setSelectedDialect] = useState(initialDialect);
  const [isDialectOpen, setIsDialectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load languages on component mount for speech mode
  useEffect(() => {
    if (mode === 'speech') {
      loadSpeechLanguages();
    }
  }, [mode]);

  const loadSpeechLanguages = async () => {
    try {
      setIsLoading(true);
      const response = await settingsAPI.getSpeechLanguages();
      if (response.data) {
        setLanguages(response.data);
      }
    } catch (error) {
      console.error('Error loading speech languages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUILanguageChange = (lang: string) => {
    changeLanguage(lang);
    setSelectedLanguage(lang);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
    setIsOpen(false);
  };

  const handleSpeechLanguageChange = (lang: Language) => {
    setSelectedLanguage(lang.code);
    if (onLanguageChange) {
      onLanguageChange(lang.code);
    }
    
    // If language has dialects and showDialects is true, open dialect selector
    if (showDialects && lang.dialects && lang.dialects.length > 0) {
      setIsDialectOpen(true);
    } else {
      setIsOpen(false);
      
      // If language has a default dialect, select it
      if (lang.dialects && lang.dialects.length > 0) {
        setSelectedDialect(lang.dialects[0].code);
        if (onDialectChange) {
          onDialectChange(lang.dialects[0].code);
        }
      }
    }
  };

  const handleDialectChange = (dialect: { code: string; name: string }) => {
    setSelectedDialect(dialect.code);
    if (onDialectChange) {
      onDialectChange(dialect.code);
    }
    setIsDialectOpen(false);
    setIsOpen(false);
  };

  // Get the current language name
  const getCurrentLanguageName = () => {
    if (mode === 'ui') {
      return locales[language as keyof typeof locales] || language.toUpperCase();
    } else {
      const lang = languages.find(l => l.code === selectedLanguage);
      return lang?.name || selectedLanguage.toUpperCase();
    }
  };

  // Get the current dialect name
  const getCurrentDialectName = () => {
    if (!selectedDialect) return null;
    
    const lang = languages.find(l => l.code === selectedLanguage);
    const dialect = lang?.dialects?.find(d => d.code === selectedDialect);
    return dialect?.name || selectedDialect;
  };

  // UI Language Selector
  if (mode === 'ui') {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          className="flex items-center space-x-1 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Select language"
        >
          <span className="text-sm font-medium">{language.toUpperCase()}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {isOpen && (
          <div className={`absolute ${dropdownPosition === 'right' ? 'right-0' : 'left-0'} mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700`}>
            {Object.entries(locales).map(([code, name]) => (
              <button
                key={code}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  language === code
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleUILanguageChange(code)}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Speech Language Selector
  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-col space-y-2">
        <div className="relative">
          <button
            type="button"
            className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setIsOpen(!isOpen)}
            disabled={isLoading}
            aria-label="Select speech language"
          >
            <span className="text-sm font-medium">{getCurrentLanguageName()}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {isOpen && (
            <div className={`absolute ${dropdownPosition === 'right' ? 'right-0' : 'left-0'} mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700`}>
              {languages.map(lang => (
                <button
                  key={lang.code}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    selectedLanguage === lang.code
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleSpeechLanguageChange(lang)}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {showDialects && (
          <div className="relative">
            <button
              type="button"
              className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setIsDialectOpen(!isDialectOpen)}
              disabled={isLoading || !selectedLanguage}
              aria-label="Select dialect"
            >
              <span className="text-sm font-medium">
                {getCurrentDialectName() || 'Select dialect'}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {isDialectOpen && (
              <div className={`absolute ${dropdownPosition === 'right' ? 'right-0' : 'left-0'} mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700`}>
                {languages
                  .find(lang => lang.code === selectedLanguage)
                  ?.dialects?.map(dialect => (
                    <button
                      key={dialect.code}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        selectedDialect === dialect.code
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => handleDialectChange(dialect)}
                    >
                      {dialect.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}