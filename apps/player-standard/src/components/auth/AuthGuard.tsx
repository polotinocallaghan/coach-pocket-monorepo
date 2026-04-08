'use client';

import { useAuth } from '@coach-pocket/core';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const publicPaths = ['/login', '/signup'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading, isGuest } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!loading && !user && !isGuest && !publicPaths.includes(pathname)) {
            router.push('/login');
        }
    }, [user, loading, isGuest, pathname, router]);

    if (!mounted) return null;

    if (loading) {
        return (
            <div className="flex bg-slate-900 items-center justify-center min-h-screen z-[100] relative">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    if (!user && !isGuest && !publicPaths.includes(pathname)) {
        return (
            <div className="flex bg-slate-900 items-center justify-center min-h-screen z-[100] relative">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    return <>{children}</>;
}
