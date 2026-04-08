'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ModalState {
    id: string;
    component: string;
    props?: Record<string, unknown>;
}

interface NavigationState {
    // Scroll positions per route
    scrollPositions: Record<string, number>;

    // Modal stack for spatial navigation
    modalStack: ModalState[];

    // Drawer state
    drawerOpen: boolean;
    drawerContent: string | null;

    // Navigation direction (for animation)
    direction: 'forward' | 'back';
    previousRoute: string | null;
    currentRoute: string | null;

    // Route history for spatial back
    routeHistory: string[];

    // Actions
    setScrollPosition: (route: string, position: number) => void;
    getScrollPosition: (route: string) => number;

    pushModal: (modal: ModalState) => void;
    popModal: () => ModalState | undefined;
    clearModals: () => void;

    openDrawer: (content: string) => void;
    closeDrawer: () => void;

    navigateTo: (route: string) => void;
    navigateBack: () => void;
    setDirection: (dir: 'forward' | 'back') => void;
}

export const useNavigationStore = create<NavigationState>()(
    persist(
        (set, get) => ({
            scrollPositions: {},
            modalStack: [],
            drawerOpen: false,
            drawerContent: null,
            direction: 'forward',
            previousRoute: null,
            currentRoute: null,
            routeHistory: [],

            setScrollPosition: (route, position) =>
                set((state) => ({
                    scrollPositions: { ...state.scrollPositions, [route]: position },
                })),

            getScrollPosition: (route) => get().scrollPositions[route] ?? 0,

            pushModal: (modal) =>
                set((state) => ({
                    modalStack: [...state.modalStack, modal],
                })),

            popModal: () => {
                const stack = get().modalStack;
                if (stack.length === 0) return undefined;
                const popped = stack[stack.length - 1];
                set({ modalStack: stack.slice(0, -1) });
                return popped;
            },

            clearModals: () => set({ modalStack: [] }),

            openDrawer: (content) =>
                set({ drawerOpen: true, drawerContent: content }),

            closeDrawer: () =>
                set({ drawerOpen: false, drawerContent: null }),

            navigateTo: (route) =>
                set((state) => ({
                    previousRoute: state.currentRoute,
                    currentRoute: route,
                    direction: 'forward',
                    routeHistory: [...state.routeHistory, route].slice(-20), // Keep last 20
                })),

            navigateBack: () =>
                set((state) => {
                    const history = [...state.routeHistory];
                    history.pop(); // Remove current
                    const previous = history[history.length - 1] || '/';
                    return {
                        previousRoute: state.currentRoute,
                        currentRoute: previous,
                        direction: 'back',
                        routeHistory: history,
                    };
                }),

            setDirection: (dir) => set({ direction: dir }),
        }),
        {
            name: 'navigation-store',
            partialize: (state) => ({
                scrollPositions: state.scrollPositions,
                routeHistory: state.routeHistory,
            }),
        }
    )
);

// Animation variants with anti-gravity spring physics
export const pageVariants = {
    initial: (direction: 'forward' | 'back') => ({
        opacity: 0,
        x: direction === 'forward' ? 60 : -60,
        scale: 0.98,
    }),
    animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: {
            type: 'spring' as const,
            stiffness: 300,
            damping: 30,
            mass: 0.8,
        },
    },
    exit: (direction: 'forward' | 'back') => ({
        opacity: 0,
        x: direction === 'forward' ? -60 : 60,
        scale: 0.98,
        transition: {
            type: 'spring' as const,
            stiffness: 300,
            damping: 30,
            mass: 0.8,
        },
    }),
};

export const modalVariants = {
    initial: {
        opacity: 0,
        scale: 0.95,
        y: 20,
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 400,
            damping: 25,
            mass: 0.6,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
        transition: {
            type: 'spring' as const,
            stiffness: 400,
            damping: 25,
            mass: 0.6,
        },
    },
};

export const drawerVariants = {
    initial: {
        x: '100%',
    },
    animate: {
        x: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 350,
            damping: 35,
            mass: 0.7,
        },
    },
    exit: {
        x: '100%',
        transition: {
            type: 'spring' as const,
            stiffness: 350,
            damping: 35,
            mass: 0.7,
        },
    },
};

export const overlayVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15, ease: [0.4, 0, 1, 1] as [number, number, number, number] }
    },
};
