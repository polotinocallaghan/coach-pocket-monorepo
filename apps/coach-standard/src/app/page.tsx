'use client';

import { useAuth } from '@coach-pocket/core';
import CoachDashboard from '@/components/features/dashboard/CoachDashboard';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return <CoachDashboard />;
}
