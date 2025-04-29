/**
 * Login form component
 * Handles user authentication with email/password and Google
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  /**
   * Handle form submission for email/password login
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, error } = await login(email, password);
      
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }
      
      // Redirect to dashboard on successful login
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      setLoading(false);
    }
  };

  /**
   * Handle Google sign in
   */
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const { user, error } = await loginWithGoogle();
      
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }
      
      // Redirect to dashboard on successful login
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to sign in with Google.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Sign In to NeuroNest AI</h1>
        <p className="mt-2 text-gray-600">
          Enter your credentials to access your account
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          {error}
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your password"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="remember-me" className="block ml-2 text-sm text-gray-700">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot your password?
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-gray-500 bg-white">Or continue with</span>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.0001 4.67676C13.0358 4.67676 14.0637 5.02824 14.8577 5.6904L17.8605 2.75752C16.1205 1.14752 14.0106 0.226562 12.0001 0.226562C8.5368 0.226562 5.50461 2.09468 3.95789 4.90282L7.32631 7.53229C8.10461 5.85282 9.90461 4.67676 12.0001 4.67676Z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.2744C23.49 11.4599 23.4172 10.6454 23.2716 9.85938H12V14.2594H18.4716C18.1533 15.7344 17.2716 17.0139 16.0001 17.8285V20.7139H19.8533C22.0899 18.6744 23.49 15.7344 23.49 12.2744Z"
              />
              <path
                fill="#FBBC05"
                d="M12.0001 24.0001C15.2358 24.0001 17.9532 22.9376 19.8532 20.7139L16.0001 17.8285C14.9532 18.5376 13.6173 18.9829 12.0001 18.9829C9.90461 18.9829 8.10461 17.8068 7.32631 16.1274L3.47266 18.7568C5.01938 21.9829 8.28045 24.0001 12.0001 24.0001Z"
              />
              <path
                fill="#34A853"
                d="M3.95789 4.90282C3.78333 5.42094 3.68789 5.97468 3.68789 6.54376C3.68789 7.11282 3.78333 7.66657 3.95789 8.18468L3.95789 8.18468L7.32631 5.55521C7.03158 4.89376 6.86789 4.17094 6.86789 3.42094C6.86789 2.67094 7.03158 1.94813 7.32631 1.28668L3.95789 4.90282Z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;