'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  initialTheme?: Theme;
  onChange?: (theme: Theme) => void;
  className?: string;
}

export default function ThemeToggle({ 
  initialTheme, 
  onChange,
  className = ''
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme || 'system');
  const { t } = useTranslation();

  useEffect(() => {
    // If initialTheme is provided, use it
    if (initialTheme) {
      setTheme(initialTheme);
      applyTheme(initialTheme);
      return;
    }

    // Otherwise, get theme from localStorage or use system preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
        applyTheme('dark');
      } else {
        setTheme('light');
        applyTheme('light');
      }
    }
  }, [initialTheme]);

  useEffect(() => {
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    const isDark = newTheme === 'dark' || (newTheme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const setNewTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    
    if (onChange) {
      onChange(newTheme);
    }
  };

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setNewTheme('light')}
          className={`p-2 rounded-md flex items-center justify-center ${
            theme === 'light'
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label={t('settings.lightTheme')}
          title={t('settings.lightTheme')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
          <span className="ml-2">{t('settings.light')}</span>
        </button>
        
        <button
          onClick={() => setNewTheme('dark')}
          className={`p-2 rounded-md flex items-center justify-center ${
            theme === 'dark'
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label={t('settings.darkTheme')}
          title={t('settings.darkTheme')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
          <span className="ml-2">{t('settings.dark')}</span>
        </button>
        
        <button
          onClick={() => setNewTheme('system')}
          className={`p-2 rounded-md flex items-center justify-center ${
            theme === 'system'
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label={t('settings.systemTheme')}
          title={t('settings.systemTheme')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
          </svg>
          <span className="ml-2">{t('settings.system')}</span>
        </button>
      </div>
    </div>
  );
}