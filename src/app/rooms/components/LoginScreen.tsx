'use client';

import Image from 'next/image';
import Logo from '../../chatty-logo.png';

interface LoginScreenProps {
  username: string;
  setUsername: (value: string) => void;
  showAdminFields: boolean;
  toggleAdminFields: () => void;
  adminPassword: string;
  setAdminPassword: (value: string) => void;
  handleLogin: () => void;
  isSubmitting?: boolean;
}

export default function LoginScreen({
  username,
  setUsername,
  showAdminFields,
  toggleAdminFields,
  adminPassword,
  setAdminPassword,
  handleLogin,
  isSubmitting = false,
}: LoginScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-black">
      <Image className="w-30" src={Logo} alt="Chatty logo" />

      <div className="w-full max-w-md">
        <div className="mb-4">
          <label className="mb-1 block text-base font-medium">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border p-2"
            placeholder="Enter username"
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={toggleAdminFields}
            className="text-sm text-blue-500 underline"
            disabled={isSubmitting}
          >
            {showAdminFields ? 'Login as regular user' : 'Login as admin'}
          </button>
        </div>

        {showAdminFields && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">
              Admin Password
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full rounded border p-2"
              placeholder="Enter admin password"
              disabled={isSubmitting}
            />
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isSubmitting}
          className={`flex w-full cursor-pointer items-center justify-center rounded p-2 text-white transition ${
            showAdminFields ? 'bg-red-500' : 'bg-blue-500'
          } ${isSubmitting ? 'cursor-not-allowed opacity-75' : ''}`}
        >
          {isSubmitting ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Loading...
            </>
          ) : showAdminFields ? (
            'Enter as Admin'
          ) : (
            'Enter Chat'
          )}
        </button>
      </div>
    </div>
  );
}
