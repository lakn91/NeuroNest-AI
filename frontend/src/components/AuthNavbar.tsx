'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged, logoutUser } from '@/utils/localStorage';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from '@/i18n';

export default function AuthNavbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useTranslation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="w-full py-4 px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">NeuroNest-AI</h1>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8">
          <Link 
            href="/" 
            className={`${isActive('/') ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
          >
            {t('common.home')}
          </Link>
          <Link 
            href="/chat" 
            className={`${isActive('/chat') ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
          >
            {t('common.chat')}
          </Link>
          <Link 
            href="/projects" 
            className={`${isActive('/projects') ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
          >
            {t('common.projects')}
          </Link>
          <Link 
            href="/settings" 
            className={`${isActive('/settings') ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
          >
            {t('common.settings')}
          </Link>
        </nav>
        
        {/* User Menu (Desktop) */}
        <div className="hidden md:flex items-center space-x-4">
          <ThemeToggle />
          <LanguageSelector />
          
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-2 focus:outline-none"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-700 dark:text-gray-300">{user.displayName || user.email}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                  <Link 
                    href="/settings" 
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    {t('common.settings')}
                  </Link>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={handleLogout}
                  >
                    {t('common.signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex space-x-4">
              <Link 
                href="/auth/login" 
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {t('common.signIn')}
              </Link>
              <Link 
                href="/auth/register" 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {t('common.signUp')}
              </Link>
            </div>
          )}
        </div>
        
        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <nav className="flex flex-col space-y-4">
            <Link 
              href="/" 
              className={`${isActive('/') ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/chat" 
              className={`${isActive('/chat') ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Chat
            </Link>
            <Link 
              href="/projects" 
              className={`${isActive('/projects') ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Projects
            </Link>
            <Link 
              href="/settings" 
              className={`${isActive('/settings') ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Settings
            </Link>
            
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <ThemeToggle />
              
              {!loading && (
                <>
                  {user ? (
                    <>
                      <div className="flex-1 ml-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{user.displayName || user.email}</span>
                        </div>
                        <button
                          className="w-full text-left text-gray-700 dark:text-gray-300"
                          onClick={handleLogout}
                        >
                          Sign out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 ml-4 flex flex-col space-y-4">
                      <Link 
                        href="/auth/login" 
                        className="text-gray-700 dark:text-gray-300"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link 
                        href="/auth/register" 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign up
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}