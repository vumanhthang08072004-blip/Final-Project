'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Loading state — full-screen emerald spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-300/30 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-transparent border-t-emerald-400 rounded-full absolute top-0 left-0 animate-spin"></div>
          </div>
          <p className="text-emerald-200 text-sm font-medium animate-pulse">
            Đang xác thực...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated — show nothing (redirect is happening)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
