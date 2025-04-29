/**
 * Dialect Selector Component
 * Allows users to select their preferred Arabic dialect
 */

import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

const DialectSelector = ({ className = '' }) => {
  const { settings, updateDialect, getAvailableDialects, getCurrentDialect } = useSettings();
  const [selectedDialect, setSelectedDialect] = useState(settings.dialect);
  const [isOpen, setIsOpen] = useState(false);
  const dialects = getAvailableDialects();
  const currentDialect = getCurrentDialect();

  // Update selected dialect when settings change
  useEffect(() => {
    setSelectedDialect(settings.dialect);
  }, [settings.dialect]);

  /**
   * Handle dialect selection
   * @param {string} dialectId - Selected dialect ID
   */
  const handleSelectDialect = async (dialectId) => {
    setSelectedDialect(dialectId);
    await updateDialect(dialectId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center">
          <span className="ml-2 block truncate">{currentDialect.name}</span>
        </span>
        <span className="ml-3 block">
          <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
          <ul
            className="py-1 overflow-auto text-base rounded-md max-h-60 focus:outline-none sm:text-sm"
            tabIndex="-1"
            role="listbox"
            aria-labelledby="dialect-selector"
          >
            {dialects.map((dialect) => (
              <li
                key={dialect.id}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-100 ${
                  selectedDialect === dialect.id ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'
                }`}
                onClick={() => handleSelectDialect(dialect.id)}
                role="option"
                aria-selected={selectedDialect === dialect.id}
              >
                <div className="flex items-center">
                  <span className={`block truncate ${selectedDialect === dialect.id ? 'font-semibold' : 'font-normal'}`}>
                    {dialect.name}
                  </span>
                </div>

                {selectedDialect === dialect.id && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DialectSelector;