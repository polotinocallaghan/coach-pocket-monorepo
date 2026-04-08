'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useNavigationStore } from './navigation-store';

/**
 * Custom hook for scroll restoration with anti-gravity feel.
 * Saves scroll position on route leave, restores on return.
 */
export function useScrollRestoration() {
    const pathname = usePathname();
    const { setScrollPosition, getScrollPosition, navigateTo } = useNavigationStore();
    const scrollableRef = useRef<HTMLElement | null>(null);
    const hasRestored = useRef(false);

    // Save scroll position before leaving
    const savePosition = useCallback(() => {
        const element = scrollableRef.current || document.documentElement;
        const scrollTop = element.scrollTop || window.scrollY;
        if (pathname) {
            setScrollPosition(pathname, scrollTop);
        }
    }, [pathname, setScrollPosition]);

    // Restore scroll position
    const restorePosition = useCallback(() => {
        if (hasRestored.current) return;

        const savedPosition = getScrollPosition(pathname);
        if (savedPosition > 0) {
            // Use requestAnimationFrame for smooth restoration
            requestAnimationFrame(() => {
                const element = scrollableRef.current || window;
                if (element === window) {
                    window.scrollTo({ top: savedPosition, behavior: 'instant' });
                } else {
                    (element as HTMLElement).scrollTop = savedPosition;
                }
                hasRestored.current = true;
            });
        }
    }, [pathname, getScrollPosition]);

    // Track route changes
    useEffect(() => {
        navigateTo(pathname);
        hasRestored.current = false;

        // Restore after a brief delay to ensure content is rendered
        const timer = setTimeout(restorePosition, 50);

        return () => {
            clearTimeout(timer);
            savePosition();
        };
    }, [pathname, navigateTo, restorePosition, savePosition]);

    // Save on scroll (debounced)
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const handleScroll = () => {
            clearTimeout(timeout);
            timeout = setTimeout(savePosition, 100);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timeout);
        };
    }, [savePosition]);

    // Save before unload
    useEffect(() => {
        const handleBeforeUnload = () => savePosition();
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [savePosition]);

    return { scrollableRef, savePosition, restorePosition };
}

/**
 * Hook for detecting navigation direction
 */
export function useNavigationDirection() {
    const { direction, setDirection } = useNavigationStore();

    const goBack = useCallback(() => {
        setDirection('back');
        // Allow state to update before triggering navigation
        return new Promise<void>(resolve => {
            requestAnimationFrame(() => resolve());
        });
    }, [setDirection]);

    const goForward = useCallback(() => {
        setDirection('forward');
        return new Promise<void>(resolve => {
            requestAnimationFrame(() => resolve());
        });
    }, [setDirection]);

    return { direction, goBack, goForward };
}
