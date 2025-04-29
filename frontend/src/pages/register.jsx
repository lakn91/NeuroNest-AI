/**
 * Register Page
 * Displays the registration form and handles user creation
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import RegisterForm from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const { currentUser } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  return (
    <>
      <Head>
        <title>Create Account | NeuroNest AI</title>
        <meta name="description" content="Create a new NeuroNest AI account" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">NeuroNest AI</h2>
            <p className="mt-2 text-sm text-gray-600">
              Create an account to start building intelligent applications
            </p>
          </div>
          
          <RegisterForm />
        </div>
      </div>
    </>
  );
};

export default RegisterPage;