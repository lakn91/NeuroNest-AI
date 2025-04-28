'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { settingsAPI } from '@/utils/api';
import LanguageSelector from './LanguageSelector';

interface SpeechSettingsProps {
  onSettingsChange?: (settings: SpeechSettingsType) => void;
  initialSettings?: Partial<SpeechSettingsType>;
  className?: string;
}

export interface SpeechSettingsType {
  enabled: boolean;
  language: string;
  dialect?: string;
  enhanceAudio: boolean;
  useAIEnhancement: boolean;
}

const SpeechSettings: React.FC<SpeechSettingsProps> = ({
  onSettingsChange,
  initialSettings,
  className = ''
}) => {
  const [settings, setSettings] = useState<SpeechSettingsType>({
    enabled: initialSettings?.enabled ?? true,
    language: initialSettings?.language ?? 'en-US',
    dialect: initialSettings?.dialect,
    enhanceAudio: initialSettings?.enhanceAudio ?? true,
    useAIEnhancement: initialSettings?.useAIEnhancement ?? true
  });
  const { t } = useTranslation();

  // Notify parent component when settings change
  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  }, [settings, onSettingsChange]);

  const handleToggleEnabled = () => {
    setSettings(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  };

  const handleLanguageChange = (language: string) => {
    setSettings(prev => ({
      ...prev,
      language
    }));
  };

  const handleDialectChange = (dialect: string) => {
    setSettings(prev => ({
      ...prev,
      dialect
    }));
  };

  const handleToggleEnhanceAudio = () => {
    setSettings(prev => ({
      ...prev,
      enhanceAudio: !prev.enhanceAudio,
      // If enhance audio is disabled, also disable AI enhancement
      useAIEnhancement: !prev.enhanceAudio ? false : prev.useAIEnhancement
    }));
  };

  const handleToggleAIEnhancement = () => {
    setSettings(prev => ({
      ...prev,
      useAIEnhancement: !prev.useAIEnhancement
    }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-medium">{t('settings.speechSettings')}</h3>
      
      <div className="flex items-center">
        <input
          id="speech-enabled"
          type="checkbox"
          checked={settings.enabled}
          onChange={handleToggleEnabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="speech-enabled" className="ml-2 block text-sm font-medium">
          {t('settings.enableSpeechRecognition')}
        </label>
      </div>
      
      {settings.enabled && (
        <>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              {t('settings.speechLanguage')}
            </label>
            <LanguageSelector
              mode="speech"
              initialLanguage={settings.language}
              initialDialect={settings.dialect}
              onLanguageChange={handleLanguageChange}
              onDialectChange={handleDialectChange}
              showDialects={true}
              className="w-full"
              dropdownPosition="left"
            />
          </div>
          
          <div className="flex items-center mt-4">
            <input
              id="enhance-audio"
              type="checkbox"
              checked={settings.enhanceAudio}
              onChange={handleToggleEnhanceAudio}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enhance-audio" className="ml-2 block text-sm font-medium">
              {t('settings.enhanceAudio')}
            </label>
          </div>
          
          {settings.enhanceAudio && (
            <div className="flex items-center mt-2 ml-6">
              <input
                id="ai-enhancement"
                type="checkbox"
                checked={settings.useAIEnhancement}
                onChange={handleToggleAIEnhancement}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ai-enhancement" className="ml-2 block text-sm font-medium">
                {t('settings.useAIEnhancement')}
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SpeechSettings;