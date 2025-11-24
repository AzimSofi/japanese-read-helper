'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CSS_VARS } from '@/lib/constants';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.message || 'Invalid password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleLogin}
          className="p-8 rounded-lg border shadow-lg"
          style={{
            borderColor: CSS_VARS.NEUTRAL,
            backgroundColor: CSS_VARS.BASE,
          }}
        >
          <h1 className="text-3xl font-bold mb-6 text-center">
            Read Helper
          </h1>
          <p className="text-center mb-6 text-gray-600">
            Japanese Reading Assistant
          </p>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Enter password"
              className="w-full p-3 border rounded outline-none bg-white transition-all"
              style={{
                borderColor: isFocused ? CSS_VARS.PRIMARY : CSS_VARS.NEUTRAL,
                boxShadow: isFocused ? `0 0 0 3px ${CSS_VARS.PRIMARY}33` : 'none',
              }}
              required={true}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: CSS_VARS.PRIMARY,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = CSS_VARS.PRIMARY_DARK;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = CSS_VARS.PRIMARY;
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
