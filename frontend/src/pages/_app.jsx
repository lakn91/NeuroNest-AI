/**
 * Main App Component
 * Wraps the entire application with necessary providers
 */

import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { DatabaseProvider } from '../contexts/DatabaseContext';
import { AuthProvider } from '../contexts/AuthContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { ProjectProvider } from '../contexts/ProjectContext';
import { ConversationProvider } from '../contexts/ConversationContext';
import { AgentMemoryProvider } from '../contexts/AgentMemoryContext';
import { AgentProvider } from '../contexts/AgentContext';
import { RuntimeProvider } from '../contexts/RuntimeContext';
import '../styles/globals.css';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/'];

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  // Check if the current route is public
  const isPublicRoute = publicRoutes.includes(router.pathname);
  
  return (
    <>
      <Head>
        <title>NeuroNest AI</title>
        <meta name="description" content="NeuroNest AI - Advanced AI Development Platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <DatabaseProvider>
        <AuthProvider>
          <SettingsProvider>
            <ProjectProvider>
              <ConversationProvider>
                <AgentMemoryProvider>
                  <AgentProvider>
                    <RuntimeProvider>
                      <Component {...pageProps} />
                    </RuntimeProvider>
                  </AgentProvider>
                </AgentMemoryProvider>
              </ConversationProvider>
            </ProjectProvider>
          </SettingsProvider>
        </AuthProvider>
      </DatabaseProvider>
    </>
  );
}

export default MyApp;