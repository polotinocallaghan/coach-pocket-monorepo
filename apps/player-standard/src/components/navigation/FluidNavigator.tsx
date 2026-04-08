'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useState, useEffect, Suspense } from 'react';
import SessionTypeModal from '@/components/features/session/SessionTypeModal';
import { cn } from '@/lib/utils';
import {
    Calendar,
    Dumbbell,
    BookOpen,
    Users,
    MessageSquare,
    Plus,
    Home,
    Book
} from 'lucide-react';
import Link from 'next/link';
import ProfileDashboard from '@/components/features/profile/ProfileDashboard';
import { useAuth, useAppConfig } from '@coach-pocket/core';
import NotificationBell from './NotificationBell';
import { useContextualReminders } from '@/lib/hooks/useContextualReminders';
import { useNetworkNotifier } from '@/lib/hooks/useNetworkNotifier';

interface FluidNavigatorProps {
    children: ReactNode;
}

const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
];

/**
 * Persistent navigation shell with fluid sliding indicator.
 * The shell never unmounts—only content inside transitions.
 */
export function FluidNavigator({ children }: FluidNavigatorProps) {
    useContextualReminders(); // trigger contextual notifications and reminders backend-independent scanner
    useNetworkNotifier(); // trigger incoming connection alerts globally
    const pathname = usePathname();
    const { user } = useAuth();
    const { appRole } = useAppConfig();

    // Filter Items
    const visibleNavItems = navItems;

    // Find active nav index using visible items
    const activeIndex = visibleNavItems.findIndex(item =>
        pathname === item.href ||
        (item.href !== '/' && pathname.startsWith(item.href))
    );

    const isPublicPath = ['/login', '/signup'].includes(pathname);

    if (isPublicPath) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen flex flex-col relative">
            {/* Persistent Top Bar with Suspense */}
            <Suspense fallback={<div className="h-20 bg-slate-800/50 sticky top-0 z-50 backdrop-blur-xl border-b border-slate-700/50" />}>
                <FluidHeader visibleNavItems={visibleNavItems} activeIndex={activeIndex} role={appRole} />
            </Suspense>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 pb-24 lg:pb-6 relative z-0">
                <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                >
                    {children}
                </motion.div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-lg border-t border-slate-700/50 z-40 lg:hidden">
                <div className="flex items-center justify-around p-2">
                    {visibleNavItems.map((item, index) => {
                        const isActive = activeIndex === index;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
                                className={cn(
                                    "relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300",
                                    isActive ? "text-green-400" : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="navIndicator"
                                        className="absolute inset-0 bg-green-500/10 rounded-xl"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>


        </div>
    );
}



function FluidHeader({ visibleNavItems, activeIndex, role }: { visibleNavItems: typeof navItems, activeIndex: number, role: string | null }) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showProfile, setShowProfile] = useState(false);
    const { user } = useAuth();

    // Get initials from user display name or fallback
    const initials = user?.displayName
        ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'HC';

    // Sync modal state with URL
    const showSessionTypeModal = searchParams.get('modal') === 'new-session';

    const openNewSessionModal = () => {
        const params = new URLSearchParams(searchParams);
        params.set('modal', 'new-session');
        router.push(`${pathname}?${params.toString()}`);
    };

    const closeNewSessionModal = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('modal');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <>
            <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Left Side: Profile + Logo */}
                        <div className="flex items-center gap-4 z-10">
                            {/* Profile Button */}
                            <button
                                onClick={() => setShowProfile(true)}
                                className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
                                title="My Profile"
                            >
                                <span className="text-sm font-bold text-slate-300 group-hover:text-white">{initials || 'P'}</span>
                            </button>

                            <div className="w-px h-8 bg-slate-700/50 mx-1" />

                            {/* Logo / Title */}
                            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                                    <Dumbbell className="w-5 h-5 text-white" />
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className="text-xl font-bold text-white tracking-tight">Coach<span className="text-green-400">Pocket</span></h1>
                                    <p className="text-xs text-slate-400 font-medium">Player Country Club</p>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden xl:flex items-center gap-1 bg-slate-800/50 p-1 rounded-full border border-slate-700/50 backdrop-blur-md absolute left-1/2 -translate-x-1/2 z-0">
                            {visibleNavItems.map((item, index) => {
                                const isActive = activeIndex === index;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
                                            isActive ? "text-green-400" : "text-slate-400 hover:text-slate-200"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="topNavIndicator"
                                                className="absolute inset-0 bg-green-500/10 rounded-full border border-green-500/20"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <Icon className={cn("w-4 h-4", isActive && "fill-current")} />
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Right Side Actions */}
                        <div className="flex items-center gap-3 z-10">
                            <NotificationBell />


                        </div>
                    </div>
                </div>
            </header>

            <SessionTypeModal
                isOpen={showSessionTypeModal}
                onClose={closeNewSessionModal}
            />

            <ProfileDashboard
                isOpen={showProfile}
                onClose={() => setShowProfile(false)}
            />
        </>
    );
}
