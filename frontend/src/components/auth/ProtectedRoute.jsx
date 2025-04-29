/**
 * Protected Route Component
 * Redirects to login page if user is not authenticated
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If authentication is not loading and user is not logged in
    if (!loading && !currentUser) {
      // Redirect to login page with return URL
      router.push(`/login?returnUrl=${encodeURIComponent(router.asPath)}`);
    }
  }, [currentUser, loading, router]);

  // Show nothing while loading or redirecting
  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-t-4 border-b-4 border-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If authenticated, render children
  return <>{children}</>;
};

export default ProtectedRoute;