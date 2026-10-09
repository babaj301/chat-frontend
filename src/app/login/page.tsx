'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import LoginScreen from '../rooms/components/LoginScreen';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminFields, setShowAdminFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAdminFields = () => {
    setShowAdminFields((prev) => !prev);
    if (showAdminFields) {
      setAdminPassword('');
    }
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    if (showAdminFields && !adminPassword.trim()) {
      alert('Please enter admin password');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        'https://chat-backend-gqqw.onrender.com/users',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: username,
            isAdmin: showAdminFields,
            adminPassword: showAdminFields ? adminPassword : undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to login: ${response.status}`);
      }

      const userData = await response.json();

      localStorage.setItem(
        'chat-user',
        JSON.stringify({
          id: userData.id,
          username: username.trim(),
          isAdmin: Boolean(userData.isAdmin),
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push('/rooms');
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <LoginScreen
      username={username}
      setUsername={setUsername}
      showAdminFields={showAdminFields}
      toggleAdminFields={toggleAdminFields}
      adminPassword={adminPassword}
      setAdminPassword={setAdminPassword}
      handleLogin={handleLogin}
      isSubmitting={isSubmitting}
    />
  );
}
