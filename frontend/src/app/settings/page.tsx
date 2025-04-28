'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { settingsAPI } from '@/utils/api';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import SpeechSettings, { SpeechSettingsType } from '@/components/SpeechSettings';

interface UserSettings {
  theme: string;
  language: string;
  ai_provider: string;
  api_keys: Record<string, string>;
  speech_recognition: boolean;
  speech_dialect?: string;
  speech_settings?: SpeechSettingsType;
  code_execution: boolean;
}

interface AIProvider {
  id: string;
  name: string;
  description: string;
  requires_api_key: boolean;
  api_key_url?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { t } = useTranslation();

  // Load settings and providers on component mount
  useEffect(() => {
    loadSettings();
    loadProviders();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await settingsAPI.getSettings();
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await settingsAPI.getProviders();
      if (response.data && response.data.providers) {
        setProviders(response.data.providers);
      }
    } catch (error) {
      console.error('Error loading AI providers:', error);
    }
  };

  const handleThemeChange = (theme: string) => {
    if (settings) {
      setSettings({
        ...settings,
        theme
      });
    }
  };

  const handleLanguageChange = (language: string) => {
    if (settings) {
      setSettings({
        ...settings,
        language
      });
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (settings) {
      setSettings({
        ...settings,
        ai_provider: e.target.value
      });
    }
  };

  const handleApiKeyChange = (provider: string, key: string) => {
    if (settings) {
      setSettings({
        ...settings,
        api_keys: {
          ...settings.api_keys,
          [provider]: key
        }
      });
    }
  };

  const handleSpeechSettingsChange = (speechSettings: SpeechSettingsType) => {
    if (settings) {
      setSettings({
        ...settings,
        speech_recognition: speechSettings.enabled,
        speech_dialect: speechSettings.dialect,
        speech_settings: speechSettings
      });
    }
  };

  const handleCodeExecutionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (settings) {
      setSettings({
        ...settings,
        code_execution: e.target.checked
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      setSaveMessage(null);

      const response = await settingsAPI.updateSettings(settings);
      
      setSaveMessage({
        type: 'success',
        text: t('settings.saveSuccess')
      });
      
      // Reload settings to ensure we have the latest data
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({
        type: 'error',
        text: t('settings.saveError')
      });
    } finally {
      setIsSaving(false);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">{t('settings.appearance')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">{t('settings.theme')}</h3>
            <ThemeToggle 
              initialTheme={settings?.theme || 'system'} 
              onChange={handleThemeChange} 
            />
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">{t('settings.language')}</h3>
            <LanguageSelector 
              mode="ui"
              onLanguageChange={handleLanguageChange}
              initialLanguage={settings?.language}
              dropdownPosition="left"
            />
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">{t('settings.aiSettings')}</h2>
        
        <div className="mb-4">
          <label htmlFor="ai-provider" className="block text-sm font-medium mb-1">
            {t('settings.aiProvider')}
          </label>
          <select
            id="ai-provider"
            value={settings?.ai_provider || 'gemini'}
            onChange={handleProviderChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>
        
        {providers.map(provider => (
          provider.requires_api_key && (
            <div key={provider.id} className="mb-4">
              <label htmlFor={`api-key-${provider.id}`} className="block text-sm font-medium mb-1">
                {t('settings.apiKey')} - {provider.name}
              </label>
              <div className="flex items-center">
                <input
                  id={`api-key-${provider.id}`}
                  type="password"
                  value={settings?.api_keys?.[provider.id] || ''}
                  onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                  placeholder={`${provider.name} API Key`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {provider.api_key_url && (
                  <a
                    href={provider.api_key_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-500 hover:text-blue-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {provider.description}
              </p>
            </div>
          )
        ))}
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <SpeechSettings 
          initialSettings={settings?.speech_settings || {
            enabled: settings?.speech_recognition || true,
            language: 'en-US',
            dialect: settings?.speech_dialect,
            enhanceAudio: true,
            useAIEnhancement: true
          }}
          onSettingsChange={handleSpeechSettingsChange}
        />
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">{t('settings.executionSettings')}</h2>
        
        <div className="flex items-center">
          <input
            id="code-execution"
            type="checkbox"
            checked={settings?.code_execution || false}
            onChange={handleCodeExecutionChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="code-execution" className="ml-2 block text-sm font-medium">
            {t('settings.enableCodeExecution')}
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('settings.codeExecutionDescription')}
        </p>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isSaving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSaving ? t('settings.saving') : t('settings.saveSettings')}
        </button>
      </div>
      
      {saveMessage && (
        <div className={`mt-4 p-3 rounded-md ${
          saveMessage.type === 'success'
            ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
        }`}>
          {saveMessage.text}
        </div>
      )}
    </div>
  );
}