/**
 * API Keys Settings Page
 * Allows users to manage their AI provider API keys
 */

import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ApiKeysManager from '../../components/settings/ApiKeysManager';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layouts/DashboardLayout';

const ApiKeysPage = () => {
  const { currentUser } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return null; // Don't render anything while redirecting
  }

  return (
    <DashboardLayout>
      <Head>
        <title>API Keys | NeuroNest AI</title>
        <meta name="description" content="Manage your AI provider API keys" />
      </Head>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <ApiKeysManager />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApiKeysPage;