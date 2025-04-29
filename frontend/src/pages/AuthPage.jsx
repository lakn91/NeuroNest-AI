/**
 * Authentication Page
 * Page for user login and registration
 */

import React, { useEffect } from 'react';
import { FaBrain } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/auth/AuthForm';
import { useAuth } from '../contexts/AuthContext';

const AuthPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <FaBrain className="text-indigo-600 text-5xl" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          NeuroNest AI
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your intelligent AI development platform
        </p>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <AuthForm />
      </div>
    </div>
  );
};

export default AuthPage;